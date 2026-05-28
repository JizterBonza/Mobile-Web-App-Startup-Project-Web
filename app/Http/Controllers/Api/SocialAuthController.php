<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserDetail;
use App\Models\UserCredential;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;

class SocialAuthController extends Controller
{
    /**
     * Redirect to provider's OAuth page.
     *
     * Mobile clients may pass a `redirect_uri` query param (e.g. `klasmeyt://auth`).
     * When present, it is encrypted into the OAuth `state` parameter and used by
     * the callback to deep-link back into the app with the issued token.
     */
    public function redirect(Request $request, $provider)
    {
        $this->validateProvider($provider);

        $driver = Socialite::driver($provider)->stateless();

        if ($redirectUri = $request->query('redirect_uri')) {
            $this->validateMobileRedirectUri($redirectUri);

            $state = Crypt::encryptString(json_encode([
                'redirect_uri' => $redirectUri,
                'nonce' => Str::random(16),
            ]));

            $driver = $driver->with(['state' => $state]);
        }

        return response()->json([
            'url' => $driver->redirect()->getTargetUrl(),
        ]);
    }

    /**
     * Handle provider callback
     */
    public function callback(Request $request, $provider)
    {
        $this->validateProvider($provider);

        $mobileRedirectUri = $this->extractMobileRedirectUri($request);

        try {
            // TEMPORARY FIX for SSL issues in local development
            // Remove this in production!
            if (app()->environment('local')) {
                $socialUser = Socialite::driver($provider)
                    ->stateless()
                    ->setHttpClient(new \GuzzleHttp\Client(['verify' => false]))
                    ->user();
            } else {
                $socialUser = Socialite::driver($provider)->stateless()->user();
            }

            $userDetail = UserDetail::where('email', $socialUser->getEmail())->first();

            if (!$userDetail) {
                DB::beginTransaction();

                try {
                    $nameParts = $this->parseName($socialUser->getName());

                    $userDetail = UserDetail::create([
                        'first_name' => $nameParts['first_name'],
                        'middle_name' => $nameParts['middle_name'],
                        'last_name' => $nameParts['last_name'],
                        'email' => $socialUser->getEmail(),
                        'email_confirmed' => true,
                        'mobile_number' => null,
                        'shipping_address' => null,
                        'profile_image_url' => $socialUser->getAvatar(),
                        'avatar' => $socialUser->getAvatar(),
                        'provider' => $provider,
                        'provider_id' => $socialUser->getId(),
                    ]);

                    $username = $this->generateUsername($socialUser->getEmail(), $provider);

                    $userCredential = UserCredential::create([
                        'username' => $username,
                        'password_hash' => Hash::make(Str::random(32)),
                    ]);

                    $user = User::create([
                        'user_detail_id' => $userDetail->id,
                        'user_credential_id' => $userCredential->id,
                        'status' => 'active',
                        'user_type' => 'customer',
                    ]);

                    $user->load(['userDetail', 'userCredential']);

                    DB::commit();

                    $isNewUser = true;
                } catch (\Exception $e) {
                    DB::rollBack();
                    throw $e;
                }
            } else {
                $user = User::where('user_detail_id', $userDetail->id)->first();

                if (!$user) {
                    return $this->failureResponse(
                        $mobileRedirectUri,
                        'User data inconsistency detected',
                        'data_inconsistency',
                        500
                    );
                }

                $userDetail->update([
                    'profile_image_url' => $socialUser->getAvatar() ?? $userDetail->profile_image_url,
                    'avatar' => $socialUser->getAvatar() ?? $userDetail->avatar,
                    'email_confirmed' => true,
                    'provider' => $provider,
                    'provider_id' => $socialUser->getId(),
                ]);

                $user->load(['userDetail', 'userCredential']);

                $isNewUser = false;
            }

            $token = $user->createToken('mobile-token')->plainTextToken;
            $profileComplete = $this->isProfileComplete($userDetail);

            if ($mobileRedirectUri) {
                return redirect()->away($this->appendQuery($mobileRedirectUri, [
                    'token' => $token,
                    'is_new_user' => $isNewUser ? '1' : '0',
                    'profile_complete' => $profileComplete ? '1' : '0',
                ]));
            }

            return response()->json([
                'success' => true,
                'token' => $token,
                'user' => $user,
                'is_new_user' => $isNewUser,
                'profile_complete' => $profileComplete,
            ]);
        } catch (\Exception $e) {
            return $this->failureResponse(
                $mobileRedirectUri,
                'Failed to authenticate with ' . $provider,
                $e->getMessage(),
                401
            );
        }
    }

    /**
     * Decode `redirect_uri` from the encrypted OAuth `state` parameter, if any.
     */
    protected function extractMobileRedirectUri(Request $request): ?string
    {
        $state = $request->query('state');

        if (!$state) {
            return null;
        }

        try {
            $payload = json_decode(Crypt::decryptString($state), true);
        } catch (\Throwable $e) {
            return null;
        }

        if (!is_array($payload) || empty($payload['redirect_uri'])) {
            return null;
        }

        $candidate = (string) $payload['redirect_uri'];

        return $this->isAllowedMobileRedirectUri($candidate) ? $candidate : null;
    }

    /**
     * Whitelist of allowed mobile deep-link schemes.
     */
    protected function isAllowedMobileRedirectUri(string $uri): bool
    {
        return Str::startsWith($uri, 'klasmeyt://');
    }

    protected function validateMobileRedirectUri(string $uri): void
    {
        if (!$this->isAllowedMobileRedirectUri($uri)) {
            abort(422, 'Invalid redirect_uri');
        }
    }

    /**
     * Append query parameters to a URI, preserving any existing query string.
     */
    protected function appendQuery(string $uri, array $params): string
    {
        $separator = str_contains($uri, '?') ? '&' : '?';

        return $uri . $separator . http_build_query($params);
    }

    /**
     * Build a failure response, redirecting to the mobile app when applicable.
     */
    protected function failureResponse(?string $mobileRedirectUri, string $message, string $error, int $status)
    {
        if ($mobileRedirectUri) {
            return redirect()->away($this->appendQuery($mobileRedirectUri, [
                'error' => $error,
                'message' => $message,
            ]));
        }

        return response()->json([
            'success' => false,
            'message' => $message,
            'error' => $error,
        ], $status);
    }

    /**
     * Validate provider
     */
    protected function validateProvider($provider)
    {
        $allowedProviders = ['google', 'facebook', 'github', 'twitter'];
        
        if (!in_array($provider, $allowedProviders)) {
            abort(404, 'Invalid provider');
        }
    }

    /**
     * Parse full name into parts
     */
    protected function parseName($fullName)
    {
        $parts = explode(' ', trim($fullName));
        
        if (count($parts) === 1) {
            return [
                'first_name' => $parts[0],
                'middle_name' => null,
                'last_name' => $parts[0], // Use same as first if only one name
            ];
        } elseif (count($parts) === 2) {
            return [
                'first_name' => $parts[0],
                'middle_name' => null,
                'last_name' => $parts[1],
            ];
        } else {
            // 3 or more parts
            return [
                'first_name' => $parts[0],
                'middle_name' => implode(' ', array_slice($parts, 1, -1)),
                'last_name' => end($parts),
            ];
        }
    }

    /**
     * Generate unique username from email
     */
    protected function generateUsername($email, $provider)
    {
        $baseUsername = explode('@', $email)[0];
        $baseUsername = preg_replace('/[^a-zA-Z0-9]/', '', $baseUsername); // Remove special chars
        $username = $baseUsername;
        $counter = 1;

        // Ensure username is unique
        while (UserCredential::where('username', $username)->exists()) {
            $username = $baseUsername . $counter;
            $counter++;
        }

        return $username;
    }

    /**
     * Check if user profile is complete
     */
    protected function isProfileComplete($userDetail)
    {
        // Define what makes a profile "complete"
        return !empty($userDetail->mobile_number) && 
               !empty($userDetail->shipping_address);
    }
}