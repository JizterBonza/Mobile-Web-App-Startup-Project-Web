<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserDetail;
use App\Models\UserCredential;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;

class SocialAuthController extends Controller
{
    /**
     * Redirect to provider's OAuth page
     */
    public function redirect($provider)
    {
        $this->validateProvider($provider);
        
        return response()->json([
            'url' => Socialite::driver($provider)->stateless()->redirect()->getTargetUrl()
        ]);
    }

    /**
     * Handle provider callback
     */
    public function callback(Request $request, $provider)
    {
        $this->validateProvider($provider);

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
            
            // Check if user already exists by email
            $userDetail = UserDetail::where('email', $socialUser->getEmail())->first();

            if (!$userDetail) {
                // NEW USER - Auto-register from social login
                DB::beginTransaction();

                try {
                    // Parse name from social provider
                    $nameParts = $this->parseName($socialUser->getName());

                    // Create UserDetail
                    $userDetail = UserDetail::create([
                        'first_name' => $nameParts['first_name'],
                        'middle_name' => $nameParts['middle_name'],
                        'last_name' => $nameParts['last_name'],
                        'email' => $socialUser->getEmail(),
                        'email_confirmed' => true, // Social login emails are verified
                        'mobile_number' => null, // Can be collected later
                        'shipping_address' => null, // Can be collected later
                        'profile_image_url' => $socialUser->getAvatar(),
                        'avatar' => $socialUser->getAvatar(), // Store in both fields
                    ]);

                    // Create UserCredential with social provider info
                    // Username: generated from email or social ID
                    $username = $this->generateUsername($socialUser->getEmail(), $provider);
                    
                    $userCredential = UserCredential::create([
                        'username' => $username,
                        'password_hash' => Hash::make(Str::random(32)), // Random password
                        'provider' => $provider, // Add this column to track social login
                        'provider_id' => $socialUser->getId(), // Add this column
                    ]);

                    // Create User
                    $user = User::create([
                        'user_detail_id' => $userDetail->id,
                        'user_credential_id' => $userCredential->id,
                        'status' => 'active',
                        'user_type' => 'customer',
                    ]);

                    // Load relationships
                    $user->load(['userDetail', 'userCredential']);

                    DB::commit();

                    $isNewUser = true;

                } catch (\Exception $e) {
                    DB::rollBack();
                    throw $e;
                }

            } else {
                // EXISTING USER - Find the user record
                $user = User::where('user_detail_id', $userDetail->id)->first();
                
                if (!$user) {
                    return response()->json([
                        'success' => false,
                        'message' => 'User data inconsistency detected',
                    ], 500);
                }

                // Update profile image if available
                $userDetail->update([
                    'profile_image_url' => $socialUser->getAvatar() ?? $userDetail->profile_image_url,
                    'avatar' => $socialUser->getAvatar() ?? $userDetail->avatar,
                    'email_confirmed' => true,
                ]);

                // Update provider info in credentials
                $userCredential = UserCredential::find($user->user_credential_id);
                $userCredential->update([
                    'provider' => $provider,
                    'provider_id' => $socialUser->getId(),
                ]);

                // Load relationships
                $user->load(['userDetail', 'userCredential']);

                $isNewUser = false;
            }

            // Generate token
            $token = $user->createToken('mobile-token')->plainTextToken;

            // Return success response with token
            return response()->json([
                'success' => true,
                'token' => $token,
                'user' => $user,
                'is_new_user' => $isNewUser,
                'profile_complete' => $this->isProfileComplete($userDetail),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to authenticate with ' . $provider,
                'error' => $e->getMessage()
            ], 401);
        }
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