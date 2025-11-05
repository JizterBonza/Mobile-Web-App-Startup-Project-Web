<?php

namespace App\Http\Controllers;

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
        $users = User::with(['userDetail', 'userCredential'])
            ->orderBy('created_at', 'desc')
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
        $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|string|email|max:255|unique:user_details,email',
            'mobile_number' => 'nullable|string|max:20',
            'password' => 'required|string|min:6|confirmed',
            'username' => 'nullable|string|max:100|unique:user_credentials,username',
            'user_type' => 'required|string|in:super_admin,admin,vendor,veterinarian,customer,rider',
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

            return redirect()->route('dashboard.super-admin.users.index')
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
        $user = User::with(['userDetail', 'userCredential'])->findOrFail($id);

        $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|string|email|max:255|unique:user_details,email,' . $user->user_detail_id,
            'mobile_number' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:6|confirmed',
            'username' => 'nullable|string|max:100|unique:user_credentials,username,' . $user->user_credential_id,
            'user_type' => 'required|string|in:super_admin,admin,vendor,veterinarian,customer,rider',
            'status' => 'nullable|string|in:active,inactive',
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

            return redirect()->route('dashboard.super-admin.users.index')
                ->with('success', 'User updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->withErrors(['error' => 'Failed to update user. Please try again.'])
                ->withInput();
        }
    }

    /**
     * Remove (deactivate) the specified user.
     */
    public function deactivate($id)
    {
        $user = User::findOrFail($id);

        try {
            $user->update([
                'status' => 'inactive',
            ]);

            return redirect()->route('dashboard.super-admin.users.index')
                ->with('success', 'User deactivated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Failed to deactivate user. Please try again.']);
        }
    }
}

