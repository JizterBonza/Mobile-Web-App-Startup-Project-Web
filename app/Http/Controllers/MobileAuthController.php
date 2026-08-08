<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\UserDetail;
use App\Models\UserCredential;
use App\Models\Notification;
use App\Services\AuthTokenService;
use App\Services\PasswordResetEmailService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class MobileAuthController extends Controller
{
    public function __construct(private AuthTokenService $authTokenService)
    {
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|unique:user_details,email',
            'username' => 'required|string|max:100|unique:user_credentials,username',
            'password' => ['required', 'confirmed', Password::min(8)],
            'mobile_number' => 'nullable|string|max:20',
            'shipping_address' => 'nullable|string',
            'profile_image_url' => 'nullable|url|max:255',
        ]);

        try {
            DB::beginTransaction();

            // Create UserDetail
            $userDetail = UserDetail::create([
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'mobile_number' => $data['mobile_number'] ?? null,
                'shipping_address' => $data['shipping_address'] ?? null,
                'profile_image_url' => $data['profile_image_url'] ?? null,
            ]);

            // Create UserCredential
            $userCredential = UserCredential::create([
                'username' => $data['username'],
                'password_hash' => Hash::make($data['password']),
            ]);

            // Create User
            $user = User::create([
                'user_detail_id' => $userDetail->id,
                'user_credential_id' => $userCredential->id,
                'status' => 'active', // Default status
                'user_type' => 'customer',
            ]);

            // Load relationships for response
            $user->load(['userDetail', 'userCredential']);

            DB::commit();

            // Create welcome notification for the new user
            Notification::createForUser(
                $user->id,
                'account_created',
                'Welcome to Agrify!',
                "Hello {$userDetail->first_name}! Your account has been created successfully. Start exploring our products and services.",
                Notification::CATEGORY_SYSTEM,
                $user,
                [
                    'user_id' => $user->id,
                    'email' => $userDetail->email,
                ]
            );

            $tokens = $this->authTokenService->createTokenPair($user);

            return response()->json([
                'user' => $user,
                'token' => $tokens['token'],
                'refresh_token' => $tokens['refresh_token'],
                'expires_at' => $tokens['expires_at'],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required_without_all:username,mobile_number|nullable|email',
            'username' => 'required_without_all:email,mobile_number|nullable|string',
            'mobile_number' => 'required_without_all:email,username|nullable|string|max:20',
            'password' => 'required',
        ]);

        $user = null;
        $loginField = null;

        if (! empty($data['email'])) {
            $loginField = 'email';
            $userDetail = UserDetail::where('email', $data['email'])->first();

            if (! $userDetail) {
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }

            $user = User::where('user_detail_id', $userDetail->id)->first();

            if (! $user) {
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }
        } elseif (! empty($data['username'])) {
            $loginField = 'username';
            $userCredential = UserCredential::where('username', $data['username'])->first();

            if (! $userCredential) {
                throw ValidationException::withMessages([
                    'username' => ['The provided credentials are incorrect.'],
                ]);
            }

            $user = User::where('user_credential_id', $userCredential->id)->first();

            if (! $user) {
                throw ValidationException::withMessages([
                    'username' => ['The provided credentials are incorrect.'],
                ]);
            }
        } else {
            $loginField = 'mobile_number';
            $userDetail = UserDetail::where('mobile_number', $data['mobile_number'])->first();

            if (! $userDetail) {
                throw ValidationException::withMessages([
                    'mobile_number' => ['The provided credentials are incorrect.'],
                ]);
            }

            $user = User::where('user_detail_id', $userDetail->id)->first();

            if (! $user) {
                throw ValidationException::withMessages([
                    'mobile_number' => ['The provided credentials are incorrect.'],
                ]);
            }
        }

        $user->load('userCredential');

        if (! $user->userCredential || ! Hash::check($data['password'], $user->userCredential->password_hash)) {
            throw ValidationException::withMessages([
                $loginField => ['The provided credentials are incorrect.'],
            ]);
        }

        // Update last login timestamp
        $user->userCredential->update([
            'last_login' => now(),
        ]);

        // Load all relationships for response
        $user->load(['userDetail', 'userCredential', 'defaultAddress']);

        // Get the default address (null if none exists)
        $defaultAddress = $user->defaultAddress;

        // Optionally remove other tokens:
        //$user->tokens()->delete();

        $tokens = $this->authTokenService->createTokenPair($user, 'mobile-login-token');

        return response()->json([
            'user' => $user,
            'token' => $tokens['token'],
            'refresh_token' => $tokens['refresh_token'],
            'expires_at' => $tokens['expires_at'],
            'default_address' => $defaultAddress,
        ]);
    }

    public function refresh(Request $request)
    {
        $data = $request->validate([
            'refresh_token' => 'required|string',
        ]);

        $tokens = $this->authTokenService->refresh($data['refresh_token']);

        if (! $tokens) {
            return response()->json([
                'message' => 'Invalid or expired refresh token.',
            ], 401);
        }

        return response()->json($tokens);
    }

    public function logout(Request $request)
    {
        $accessToken = $request->user()->currentAccessToken();

        $this->authTokenService->revokeByAccessTokenId($accessToken->id);
        $accessToken->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function checkAvailability(Request $request)
    {
        $data = $request->validate([
            'username' => 'nullable|string|max:100',
            'email' => 'nullable|email',
        ]);

        $response = [];

        if (isset($data['username'])) {
            $usernameExists = UserCredential::where('username', $data['username'])->exists();
            $response['username'] = [
                'value' => $data['username'],
                'available' => !$usernameExists,
                'message' => $usernameExists ? 'Username is already taken.' : 'Username is available.',
            ];
        }

        if (isset($data['email'])) {
            $emailExists = UserDetail::where('email', $data['email'])->exists();
            $response['email'] = [
                'value' => $data['email'],
                'available' => !$emailExists,
                'message' => $emailExists ? 'Email is already registered.' : 'Email is available.',
            ];
        }

        if (empty($response)) {
            return response()->json([
                'error' => 'Please provide at least a username or email to check.',
            ], 422);
        }

        return response()->json($response);
    }

    public function forgotPassword(Request $request, PasswordResetEmailService $passwordResetEmailService)
    {
        $data = $request->validate([
            'email' => 'required|email',
        ]);

        $user = $this->findUserByEmail($data['email']);

        if (! $user) {
            return response()->json([
                'message' => 'Email does not exist.',
            ], 404);
        }

        $user->loadMissing('userCredential');

        if (! $user->userCredential) {
            return response()->json([
                'message' => 'Email does not exist.',
            ], 404);
        }

        $otp = (string) random_int(100000, 999999);
        $expiresInMinutes = 60;

        $user->userCredential->update([
            'reset_token' => Hash::make($otp),
            'reset_token_expires' => now()->addMinutes($expiresInMinutes),
        ]);

        $emailSent = $passwordResetEmailService->send($user, $otp, $expiresInMinutes);

        if (! $emailSent) {
            return response()->json([
                'message' => 'Unable to send password reset email. Please try again later.',
            ], 500);
        }

        return response()->json([
            'message' => 'Password reset code has been sent to your email.',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string|size:6',
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = $this->findUserByEmail($data['email']);

        if (! $user) {
            return response()->json([
                'message' => 'Email does not exist.',
            ], 404);
        }

        $user->loadMissing('userCredential');

        $credential = $user->userCredential;

        if (
            ! $credential
            || ! $credential->reset_token
            || ! $credential->reset_token_expires
            || $credential->reset_token_expires->isPast()
            || ! Hash::check($data['otp'], $credential->reset_token)
        ) {
            throw ValidationException::withMessages([
                'otp' => ['The reset code is invalid or has expired.'],
            ]);
        }

        $credential->update([
            'password_hash' => Hash::make($data['password']),
            'reset_token' => null,
            'reset_token_expires' => null,
        ]);

        return response()->json([
            'message' => 'Password has been reset successfully.',
        ]);
    }

    private function findUserByEmail(string $email): ?User
    {
        $userDetail = UserDetail::where('email', $email)->first();

        if (! $userDetail) {
            return null;
        }

        return User::where('user_detail_id', $userDetail->id)->first();
    }
}
