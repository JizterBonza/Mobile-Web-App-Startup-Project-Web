<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserDetail;
use App\Models\UserCredential;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    /**
     * Redirect to provider's OAuth page (web / browser flow).
     */
    public function redirect(Request $request, $provider)
    {
        $this->validateProvider($provider);

        return response()->json([
            'url' => Socialite::driver($provider)->stateless()->redirect()->getTargetUrl(),
        ]);
    }

    /**
     * Handle provider callback (web / browser flow).
     */
    public function callback(Request $request, $provider)
    {
        $this->validateProvider($provider);

        $mobileRedirectUri = $this->extractMobileRedirectUri($request);

        try {
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

            $result = $this->authenticateSocialUser(
                $provider,
                $socialUser->getId(),
                $socialUser->getEmail(),
                $socialUser->getName(),
                $socialUser->getAvatar(),
                true
            );

            return $this->socialAuthResponse($result);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to authenticate with '.$provider,
                'error' => $e->getMessage(),
            ], 401);
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
     * Native mobile Google sign-in (Flutter google_sign_in ID token).
     */
    public function googleToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_token' => 'required|string',
        ]);

        try {
            $payload = $this->verifyGoogleIdToken($data['id_token']);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 401);
        }

        try {
            $result = $this->authenticateSocialUser(
                'google',
                $payload['sub'],
                $payload['email'],
                $payload['name'] ?? null,
                $payload['picture'] ?? null,
                filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN)
            );

            return $this->socialAuthResponse($result);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to authenticate with Google',
                'error' => $e->getMessage(),
            ], 401);
        }
    }

    /**
     * Find or create a user from social provider data.
     *
     * @return array{user: User, userDetail: UserDetail, is_new_user: bool}
     */
    protected function authenticateSocialUser(
        string $provider,
        string $providerId,
        ?string $email,
        ?string $name,
        ?string $avatar,
        bool $emailVerified
    ): array {
        if (empty($email)) {
            throw new \InvalidArgumentException('Google account did not provide an email address.');
        }

        $userDetail = UserDetail::where('email', $email)->first();

        if (! $userDetail) {
            DB::beginTransaction();

            try {
                $nameParts = $this->parseName($name ?? 'User');

                $userDetail = UserDetail::create([
                    'first_name' => $nameParts['first_name'],
                    'middle_name' => $nameParts['middle_name'],
                    'last_name' => $nameParts['last_name'],
                    'email' => $email,
                    'email_confirmed' => $emailVerified,
                    'mobile_number' => null,
                    'shipping_address' => null,
                    'profile_image_url' => $avatar,
                    'avatar' => $avatar,
                    'provider' => $provider,
                    'provider_id' => $providerId,
                ]);

                $userCredential = UserCredential::create([
                    'username' => $this->generateUsername($email),
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

            if (! $user) {
                throw new \RuntimeException('User data inconsistency detected');
            }

            $userDetail->update([
                'profile_image_url' => $avatar ?? $userDetail->profile_image_url,
                'avatar' => $avatar ?? $userDetail->avatar,
                'email_confirmed' => $emailVerified || $userDetail->email_confirmed,
                'provider' => $provider,
                'provider_id' => $providerId,
            ]);

            $user->load(['userDetail', 'userCredential']);

            $isNewUser = false;
        }

        return [
            'user' => $user,
            'userDetail' => $userDetail->fresh(),
            'is_new_user' => $isNewUser,
        ];
    }

    /**
     * @param  array{user: User, userDetail: UserDetail, is_new_user: bool}  $result
     */
    protected function socialAuthResponse(array $result): JsonResponse
    {
        $user = $result['user'];
        $userDetail = $result['userDetail'];

        $token = $user->createToken('mobile-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => $user,
            'is_new_user' => $result['is_new_user'],
            'profile_complete' => $this->isProfileComplete($userDetail),
        ]);
    }

    /**
     * @return array{sub: string, email: string, name?: string, picture?: string, email_verified?: bool}
     */
    protected function verifyGoogleIdToken(string $idToken): array
    {
        $clientIds = array_values(array_filter([
            config('services.google.client_id'),
            config('services.google.android_client_id'),
            config('services.google.ios_client_id'),
        ]));

        if ($clientIds === []) {
            throw new \InvalidArgumentException('Google OAuth is not configured on the server.');
        }

        $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        if (! $response->successful()) {
            throw new \InvalidArgumentException('Invalid or expired Google ID token.');
        }

        $payload = $response->json();

        if (! in_array($payload['aud'] ?? '', $clientIds, true)) {
            throw new \InvalidArgumentException('Google ID token audience is not allowed.');
        }

        if (empty($payload['sub']) || empty($payload['email'])) {
            throw new \InvalidArgumentException('Google ID token is missing required user information.');
        }

        return $payload;
    }

    protected function validateProvider($provider): void
    {
        $allowedProviders = ['google', 'facebook', 'github', 'twitter'];

        if (! in_array($provider, $allowedProviders)) {
            abort(404, 'Invalid provider');
        }
    }

    protected function parseName($fullName): array
    {
        $parts = explode(' ', trim($fullName));

        if (count($parts) === 1) {
            return [
                'first_name' => $parts[0],
                'middle_name' => null,
                'last_name' => $parts[0],
            ];
        }

        if (count($parts) === 2) {
            return [
                'first_name' => $parts[0],
                'middle_name' => null,
                'last_name' => $parts[1],
            ];
        }

        return [
            'first_name' => $parts[0],
            'middle_name' => implode(' ', array_slice($parts, 1, -1)),
            'last_name' => end($parts),
        ];
    }

    protected function generateUsername(string $email): string
    {
        $baseUsername = explode('@', $email)[0];
        $baseUsername = preg_replace('/[^a-zA-Z0-9]/', '', $baseUsername);
        $username = $baseUsername;
        $counter = 1;

        while (UserCredential::where('username', $username)->exists()) {
            $username = $baseUsername.$counter;
            $counter++;
        }

        return $username;
    }

    protected function isProfileComplete(UserDetail $userDetail): bool
    {
        return ! empty($userDetail->mobile_number)
            && ! empty($userDetail->shipping_address);
    }
}
