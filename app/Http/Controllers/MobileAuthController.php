<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\UserDetail;
use App\Models\UserCredential;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class MobileAuthController extends Controller
{
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

            $token = $user->createToken('mobile-token')->plainTextToken;

            return response()->json([
                'user' => $user,
                'token' => $token
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required_without:username|email',
            'username' => 'required_without:email|string',
            'password' => 'required'
        ]);

        $user = null;

        // Check if login is by email or username
        if (isset($data['email'])) {
            // Login by email
            $userDetail = UserDetail::where('email', $data['email'])->first();

            if (! $userDetail) {
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }

            // Find User through UserDetail
            $user = User::where('user_detail_id', $userDetail->id)->first();

            if (! $user) {
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }
        } else {
            // Login by username
            $userCredential = UserCredential::where('username', $data['username'])->first();

            if (! $userCredential) {
                throw ValidationException::withMessages([
                    'username' => ['The provided credentials are incorrect.'],
                ]);
            }

            // Find User through UserCredential
            $user = User::where('user_credential_id', $userCredential->id)->first();

            if (! $user) {
                throw ValidationException::withMessages([
                    'username' => ['The provided credentials are incorrect.'],
                ]);
            }
        }

        // Load UserCredential to check password
        $user->load('userCredential');

        if (! $user->userCredential || ! Hash::check($data['password'], $user->userCredential->password_hash)) {
            $field = isset($data['email']) ? 'email' : 'username';
            throw ValidationException::withMessages([
                $field => ['The provided credentials are incorrect.'],
            ]);
        }

        // Update last login timestamp
        $user->userCredential->update([
            'last_login' => now(),
        ]);

        // Load all relationships for response
        $user->load(['userDetail', 'userCredential']);

        // Optionally remove other tokens:
        //$user->tokens()->delete();

        $token = $user->createToken('mobile-login-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token
        ]);
    }

    public function logout(Request $request)
    {
        // revoke current token
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }
}
