<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use App\Models\UserDetail;
use App\Models\UserCredential;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index()
    {
        $currentUser = auth()->user();
        $query = User::with(['userDetail', 'userCredential']);

        // If current user is Admin, filter to show only Vendors, Veterinarians, and Riders
        if ($currentUser->user_type === 'admin') {
            $query->whereIn('user_type', ['vendor', 'veterinarian', 'rider']);
        }

        $users = $query->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'first_name' => $user->userDetail->first_name ?? '',
                    'middle_name' => $user->userDetail->middle_name ?? '',
                    'last_name' => $user->userDetail->last_name ?? '',
                    'email' => $user->userDetail->email ?? '',
                    'mobile_number' => $user->userDetail->mobile_number ?? '',
                    'user_type' => $user->user_type,
                    'status' => $user->status,
                    'username' => $user->userCredential->username ?? '',
                    'created_at' => $user->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $user->updated_at->format('Y-m-d H:i:s'),
                ];
            });

        return Inertia::render('Dashboard/UserManagement', [
            'users' => $users,
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        $currentUser = auth()->user();
        
        // Determine allowed user types based on current user's role
        $allowedUserTypes = ['super_admin', 'admin', 'vendor', 'veterinarian', 'customer', 'rider'];
        if ($currentUser->user_type === 'admin') {
            // Admin can only create Vendors, Veterinarians, and Riders
            $allowedUserTypes = ['vendor', 'veterinarian', 'rider'];
        }

        $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|string|email|max:255|unique:user_details,email',
            'mobile_number' => 'nullable|string|max:20',
            'password' => 'required|string|min:6|confirmed',
            'username' => 'nullable|string|max:100|unique:user_credentials,username',
            'user_type' => ['required', 'string', 'in:' . implode(',', $allowedUserTypes)],
            'status' => 'nullable|string|in:active,inactive',
        ]);

        try {
            DB::beginTransaction();

            // Generate username from email if not provided
            $username = $request->username ?? explode('@', $request->email)[0] . '_' . time();

            // Create UserDetail
            $userDetail = UserDetail::create([
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name ?? null,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'mobile_number' => $request->mobile_number ?? null,
            ]);

            // Create UserCredential
            $userCredential = UserCredential::create([
                'username' => $username,
                'password_hash' => Hash::make($request->password),
            ]);

            // Create User
            $user = User::create([
                'user_detail_id' => $userDetail->id,
                'user_credential_id' => $userCredential->id,
                'status' => $request->status ?? 'active',
                'user_type' => $request->user_type,
            ]);

            DB::commit();

            ActivityLog::log(
                'created',
                "User created: {$user->userDetail->email} (type: {$user->user_type})",
                $user,
                null,
                $user->toArray()
            );

            // Redirect based on current user's role
            $redirectRoute = $currentUser->user_type === 'admin' 
                ? 'dashboard.admin.users.index' 
                : 'dashboard.super-admin.users.index';

            return redirect()->route($redirectRoute)
                ->with('success', 'User created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->withErrors(['error' => 'Failed to create user. Please try again.'])
                ->withInput();
        }
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, $id)
    {
        $currentUser = auth()->user();
        $user = User::with(['userDetail', 'userCredential'])->findOrFail($id);

        // If current user is Admin, ensure they can't edit Admin or Super Admin users
        if ($currentUser->user_type === 'admin') {
            if (in_array($user->user_type, ['admin', 'super_admin'])) {
                return redirect()->back()
                    ->withErrors(['error' => 'You do not have permission to edit this user.']);
            }
        }

        // Determine allowed user types based on current user's role
        $allowedUserTypes = ['super_admin', 'admin', 'vendor', 'veterinarian', 'customer', 'rider'];
        if ($currentUser->user_type === 'admin') {
            // Admin can only update to Vendors, Veterinarians, and Riders
            $allowedUserTypes = ['vendor', 'veterinarian', 'rider'];
        }

        $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|string|email|max:255|unique:user_details,email,' . $user->user_detail_id,
            'mobile_number' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:6|confirmed',
            'username' => 'nullable|string|max:100|unique:user_credentials,username,' . $user->user_credential_id,
            'user_type' => ['required', 'string', 'in:' . implode(',', $allowedUserTypes)],
            'status' => 'nullable|string|in:active,inactive',
        ]);

        try {
            DB::beginTransaction();

            $user->load(['userDetail', 'userCredential']);
            $oldValues = $user->toArray();
            if (isset($oldValues['user_credential'])) {
                $oldValues['user_credential'] = array_diff_key($oldValues['user_credential'], ['password_hash' => 1]);
            }

            // Update UserDetail
            $user->userDetail->update([
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name ?? null,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'mobile_number' => $request->mobile_number ?? null,
            ]);

            // Update UserCredential
            $updateData = [];
            if ($request->filled('username')) {
                $updateData['username'] = $request->username;
            }
            if ($request->filled('password')) {
                $updateData['password_hash'] = Hash::make($request->password);
            }
            if (!empty($updateData)) {
                $user->userCredential->update($updateData);
            }

            // Update User
            $user->update([
                'status' => $request->status ?? $user->status,
                'user_type' => $request->user_type,
            ]);

            DB::commit();

            $user->refresh();
            $user->load(['userDetail', 'userCredential']);
            $newValues = $user->toArray();
            if (isset($newValues['user_credential'])) {
                $newValues['user_credential'] = array_diff_key($newValues['user_credential'], ['password_hash' => 1]);
            }

            ActivityLog::log(
                'updated',
                "User updated: {$user->userDetail->email} (type: {$user->user_type})",
                $user,
                $oldValues,
                $newValues
            );

            // Redirect based on current user's role
            $redirectRoute = $currentUser->user_type === 'admin' 
                ? 'dashboard.admin.users.index' 
                : 'dashboard.super-admin.users.index';

            return redirect()->route($redirectRoute)
                ->with('success', 'User updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->withErrors(['error' => 'Failed to update user. Please try again.'])
                ->withInput();
        }
    }

    /**
     * Update the authenticated mobile user's profile.
     */
    public function updateMobile(Request $request)
    {
        $user = auth()->user();
        $user->load(['userDetail', 'userCredential']);

        $request->validate([
            'first_name' => 'nullable|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'email' => 'nullable|string|email|max:255|unique:user_details,email,' . $user->user_detail_id,
            'mobile_number' => 'nullable|string|max:20',
            'shipping_address' => 'nullable|string',
            'profile_image_url' => 'nullable|url|max:255',
            'username' => 'nullable|string|max:100|unique:user_credentials,username,' . $user->user_credential_id,
        ]);

        try {
            DB::beginTransaction();

            // Update UserDetail - only update fields that are provided
            $userDetailData = [];
            if ($request->filled('first_name')) {
                $userDetailData['first_name'] = $request->first_name;
            }
            if ($request->filled('middle_name')) {
                $userDetailData['middle_name'] = $request->middle_name;
            }
            if ($request->filled('last_name')) {
                $userDetailData['last_name'] = $request->last_name;
            }
            if ($request->filled('email')) {
                $userDetailData['email'] = $request->email;
            }
            if ($request->has('mobile_number')) {
                $userDetailData['mobile_number'] = $request->mobile_number;
            }
            if ($request->has('shipping_address')) {
                $userDetailData['shipping_address'] = $request->shipping_address;
            }
            if ($request->filled('profile_image_url')) {
                $userDetailData['profile_image_url'] = $request->profile_image_url;
            }

            if (!empty($userDetailData)) {
                $user->userDetail->update($userDetailData);
            }

            // Update UserCredential - only update username if provided
            if ($request->filled('username')) {
                $user->userCredential->update([
                    'username' => $request->username,
                ]);
            }

            DB::commit();

            // Reload user with updated relationships
            $user->refresh();
            $user->load(['userDetail', 'userCredential']);

            return response()->json([
                'message' => 'Profile updated successfully.',
                'user' => $user
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update profile.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the authenticated mobile user's password.
     */
    public function updatePasswordMobile(Request $request)
    {
        $user = auth()->user();
        $user->load('userCredential');

        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);
        // Verify current password
        if (!Hash::check($request->current_password, $user->userCredential->password_hash)) {
            return response()->json([
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        try {
            // Update password
            $user->userCredential->update([
                'password_hash' => Hash::make($request->new_password),
            ]);

            return response()->json([
                'message' => 'Password updated successfully.',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update password.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show the authenticated user's profile page.
     */
    public function showProfile()
    {
        $user = auth()->user();
        $user->load(['userDetail', 'userCredential']);

        return Inertia::render('Dashboard/Profile', [
            'profileData' => [
                'id' => $user->id,
                'first_name' => $user->userDetail->first_name ?? '',
                'middle_name' => $user->userDetail->middle_name ?? '',
                'last_name' => $user->userDetail->last_name ?? '',
                'email' => $user->userDetail->email ?? '',
                'mobile_number' => $user->userDetail->mobile_number ?? '',
                'shipping_address' => $user->userDetail->shipping_address ?? '',
                'profile_image_url' => $user->userDetail->profile_image_url ?? '',
                'username' => $user->userCredential->username ?? '',
                'user_type' => $user->user_type,
                'status' => $user->status,
                'created_at' => $user->created_at->format('Y-m-d H:i:s'),
            ],
        ]);
    }

    /**
     * Update the authenticated user's profile.
     */
    public function updateProfile(Request $request)
    {
        $user = auth()->user();
        $user->load(['userDetail', 'userCredential']);

        $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|string|email|max:255|unique:user_details,email,' . $user->user_detail_id,
            'mobile_number' => 'nullable|string|max:20',
            'shipping_address' => 'nullable|string|max:500',
            'username' => 'nullable|string|max:100|unique:user_credentials,username,' . $user->user_credential_id,
        ]);

        try {
            DB::beginTransaction();

            // Update UserDetail
            $user->userDetail->update([
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name ?? null,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'mobile_number' => $request->mobile_number ?? null,
                'shipping_address' => $request->shipping_address ?? null,
            ]);

            // Update UserCredential username if provided
            if ($request->filled('username')) {
                $user->userCredential->update([
                    'username' => $request->username,
                ]);
            }

            DB::commit();

            return redirect()->route('profile.show')
                ->with('success', 'Profile updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->withErrors(['error' => 'Failed to update profile. Please try again.'])
                ->withInput();
        }
    }

    /**
     * Show the settings page.
     */
    public function showSettings()
    {
        $user = auth()->user();
        $user->load(['userDetail', 'userCredential']);

        return Inertia::render('Dashboard/Settings', [
            'userData' => [
                'id' => $user->id,
                'email' => $user->userDetail->email ?? '',
                'username' => $user->userCredential->username ?? '',
                'user_type' => $user->user_type,
                'last_login' => $user->userCredential->last_login ? $user->userCredential->last_login->format('Y-m-d H:i:s') : null,
            ],
        ]);
    }

    /**
     * Update the authenticated user's password.
     */
    public function updatePassword(Request $request)
    {
        $user = auth()->user();
        $user->load('userCredential');

        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ]);

        // Verify current password
        if (!Hash::check($request->current_password, $user->userCredential->password_hash)) {
            return redirect()->back()
                ->withErrors(['current_password' => 'Current password is incorrect.']);
        }

        try {
            $user->userCredential->update([
                'password_hash' => Hash::make($request->password),
            ]);

            return redirect()->route('settings.show')
                ->with('success', 'Password updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Failed to update password. Please try again.']);
        }
    }

    /**
     * Remove (deactivate) the specified user.
     */
    public function deactivate($id)
    {
        $currentUser = auth()->user();
        $user = User::with('userDetail')->findOrFail($id);

        // If current user is Admin, ensure they can't deactivate Admin or Super Admin users
        if ($currentUser->user_type === 'admin') {
            if (in_array($user->user_type, ['admin', 'super_admin'])) {
                return redirect()->back()
                    ->withErrors(['error' => 'You do not have permission to deactivate this user.']);
            }
        }

        try {
            $user->update([
                'status' => 'inactive',
            ]);

            ActivityLog::log(
                'deactivated',
                'User deactivated: ' . ($user->userDetail->email ?? "ID {$user->id}"),
                $user,
                $user->load('userDetail')->toArray(),
                null
            );

            // Redirect based on current user's role
            $redirectRoute = $currentUser->user_type === 'admin' 
                ? 'dashboard.admin.users.index' 
                : 'dashboard.super-admin.users.index';

            return redirect()->route($redirectRoute)
                ->with('success', 'User deactivated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Failed to deactivate user. Please try again.']);
        }
    }
}

