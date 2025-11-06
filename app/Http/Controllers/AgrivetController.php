<?php

namespace App\Http\Controllers;

use App\Models\Agrivet;
use App\Models\User;
use App\Models\UserDetail;
use App\Models\UserCredential;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class AgrivetController extends Controller
{
    /**
     * Display a listing of agrivets.
     */
    public function index()
    {
        $agrivets = Agrivet::orderBy('created_at', 'desc')
            ->get()
            ->map(function ($agrivet) {
                return [
                    'id' => $agrivet->id,
                    'name' => $agrivet->name,
                    'description' => $agrivet->description,
                    'address' => $agrivet->address,
                    'latitude' => $agrivet->latitude,
                    'longitude' => $agrivet->longitude,
                    'contact_number' => $agrivet->contact_number,
                    'email' => $agrivet->email,
                    'logo_url' => $agrivet->logo_url,
                    'status' => $agrivet->status,
                    'created_at' => $agrivet->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $agrivet->updated_at->format('Y-m-d H:i:s'),
                ];
            });

        return Inertia::render('Dashboard/AgrivetManagement', [
            'agrivets' => $agrivets,
        ]);
    }

    /**
     * Store a newly created agrivet.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'address' => 'nullable|string|max:255',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'contact_number' => 'nullable|string|max:20',
            'email' => 'nullable|string|email|max:255',
            'logo_url' => 'nullable|string|max:255',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        try {
            $agrivet = Agrivet::create([
                'name' => $request->name,
                'description' => $request->description ?? null,
                'address' => $request->address ?? null,
                'latitude' => $request->latitude ?? null,
                'longitude' => $request->longitude ?? null,
                'contact_number' => $request->contact_number ?? null,
                'email' => $request->email ?? null,
                'logo_url' => $request->logo_url ?? null,
                'status' => $request->status ?? 'active',
            ]);

            // Redirect based on current user's role
            $currentUser = auth()->user();
            $redirectRoute = $currentUser->user_type === 'admin' 
                ? 'dashboard.admin.agrivets.index' 
                : 'dashboard.super-admin.agrivets.index';

            return redirect()->route($redirectRoute)
                ->with('success', 'Agrivet created successfully.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Failed to create agrivet. Please try again.'])
                ->withInput();
        }
    }

    /**
     * Update the specified agrivet.
     */
    public function update(Request $request, $id)
    {
        $agrivet = Agrivet::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'address' => 'nullable|string|max:255',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'contact_number' => 'nullable|string|max:20',
            'email' => 'nullable|string|email|max:255',
            'logo_url' => 'nullable|string|max:255',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        try {
            $agrivet->update([
                'name' => $request->name,
                'description' => $request->description ?? null,
                'address' => $request->address ?? null,
                'latitude' => $request->latitude ?? null,
                'longitude' => $request->longitude ?? null,
                'contact_number' => $request->contact_number ?? null,
                'email' => $request->email ?? null,
                'logo_url' => $request->logo_url ?? null,
                'status' => $request->status ?? $agrivet->status,
            ]);

            // Redirect based on current user's role
            $currentUser = auth()->user();
            $redirectRoute = $currentUser->user_type === 'admin' 
                ? 'dashboard.admin.agrivets.index' 
                : 'dashboard.super-admin.agrivets.index';

            return redirect()->route($redirectRoute)
                ->with('success', 'Agrivet updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Failed to update agrivet. Please try again.'])
                ->withInput();
        }
    }

    /**
     * Remove (deactivate) the specified agrivet.
     */
    public function destroy($id)
    {
        $agrivet = Agrivet::findOrFail($id);

        try {
            $agrivet->update([
                'status' => 'inactive',
            ]);

            // Redirect based on current user's role
            $currentUser = auth()->user();
            $redirectRoute = $currentUser->user_type === 'admin' 
                ? 'dashboard.admin.agrivets.index' 
                : 'dashboard.super-admin.agrivets.index';

            return redirect()->route($redirectRoute)
                ->with('success', 'Agrivet deactivated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Failed to deactivate agrivet. Please try again.']);
        }
    }

    /**
     * Display vendors for a specific agrivet.
     */
    public function showVendors($id)
    {
        $agrivet = Agrivet::findOrFail($id);

        // Get vendors associated with this agrivet
        $vendors = $agrivet->vendors()
            ->where('user_type', 'vendor')
            ->with(['userDetail', 'userCredential'])
            ->get()
            ->map(function ($vendor) {
                return [
                    'id' => $vendor->id,
                    'first_name' => $vendor->userDetail->first_name ?? '',
                    'middle_name' => $vendor->userDetail->middle_name ?? '',
                    'last_name' => $vendor->userDetail->last_name ?? '',
                    'email' => $vendor->userDetail->email ?? '',
                    'mobile_number' => $vendor->userDetail->mobile_number ?? '',
                    'username' => $vendor->userCredential->username ?? '',
                    'status' => $vendor->status,
                    'pivot' => [
                        'status' => $vendor->pivot->status ?? 'active',
                    ],
                    'created_at' => $vendor->created_at->format('Y-m-d H:i:s'),
                ];
            });

        // Get all available vendors (not yet associated with this agrivet)
        $associatedVendorIds = $agrivet->vendors()->pluck('users.id')->toArray();
        $availableVendors = User::with(['userDetail', 'userCredential'])
            ->where('user_type', 'vendor')
            ->whereNotIn('id', $associatedVendorIds)
            ->get()
            ->map(function ($vendor) {
                return [
                    'id' => $vendor->id,
                    'first_name' => $vendor->userDetail->first_name ?? '',
                    'middle_name' => $vendor->userDetail->middle_name ?? '',
                    'last_name' => $vendor->userDetail->last_name ?? '',
                    'email' => $vendor->userDetail->email ?? '',
                ];
            });

        return Inertia::render('Dashboard/AgrivetVendors', [
            'agrivet' => [
                'id' => $agrivet->id,
                'name' => $agrivet->name,
            ],
            'vendors' => $vendors,
            'availableVendors' => $availableVendors,
        ]);
    }

    /**
     * Store a newly created vendor and associate with agrivet.
     */
    public function storeVendor(Request $request, $id)
    {
        $agrivet = Agrivet::findOrFail($id);

        $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|string|email|max:255|unique:user_details,email',
            'mobile_number' => 'nullable|string|max:20',
            'password' => 'required|string|min:6|confirmed',
            'username' => 'nullable|string|max:100|unique:user_credentials,username',
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

            // Create User (vendor)
            $vendor = User::create([
                'user_detail_id' => $userDetail->id,
                'user_credential_id' => $userCredential->id,
                'status' => $request->status ?? 'active',
                'user_type' => 'vendor',
            ]);

            // Associate vendor with agrivet
            $agrivet->vendors()->attach($vendor->id, [
                'status' => 'active',
            ]);

            DB::commit();

            // Redirect based on current user's role
            $currentUser = auth()->user();
            $redirectRoute = $currentUser->user_type === 'admin' 
                ? 'dashboard.admin.agrivets.vendors.index' 
                : 'dashboard.super-admin.agrivets.vendors.index';

            return redirect()->route($redirectRoute, $id)
                ->with('success', 'Vendor created and added to agrivet successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->withErrors(['error' => 'Failed to create vendor. Please try again.'])
                ->withInput();
        }
    }

    /**
     * Update the specified vendor.
     */
    public function updateVendor(Request $request, $id, $vendorId)
    {
        $agrivet = Agrivet::findOrFail($id);
        $vendor = User::with(['userDetail', 'userCredential'])->findOrFail($vendorId);

        // Verify vendor is associated with this agrivet
        if (!$agrivet->vendors()->where('users.id', $vendorId)->exists()) {
            return redirect()->back()
                ->withErrors(['error' => 'Vendor is not associated with this agrivet.']);
        }

        $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|string|email|max:255|unique:user_details,email,' . $vendor->user_detail_id,
            'mobile_number' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:6|confirmed',
            'username' => 'nullable|string|max:100|unique:user_credentials,username,' . $vendor->user_credential_id,
            'status' => 'nullable|string|in:active,inactive',
        ]);

        try {
            DB::beginTransaction();

            // Update UserDetail
            $vendor->userDetail->update([
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
                $vendor->userCredential->update($updateData);
            }

            // Update User
            $vendor->update([
                'status' => $request->status ?? $vendor->status,
            ]);

            // Update pivot status if provided
            if ($request->has('pivot_status')) {
                $agrivet->vendors()->updateExistingPivot($vendorId, [
                    'status' => $request->pivot_status,
                ]);
            }

            DB::commit();

            // Redirect based on current user's role
            $currentUser = auth()->user();
            $redirectRoute = $currentUser->user_type === 'admin' 
                ? 'dashboard.admin.agrivets.vendors.index' 
                : 'dashboard.super-admin.agrivets.vendors.index';

            return redirect()->route($redirectRoute, $id)
                ->with('success', 'Vendor updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->withErrors(['error' => 'Failed to update vendor. Please try again.'])
                ->withInput();
        }
    }

    /**
     * Remove (deactivate) vendor from agrivet.
     */
    public function removeVendor($id, $vendorId)
    {
        $agrivet = Agrivet::findOrFail($id);
        $vendor = User::findOrFail($vendorId);

        // Verify vendor is associated with this agrivet
        if (!$agrivet->vendors()->where('users.id', $vendorId)->exists()) {
            return redirect()->back()
                ->withErrors(['error' => 'Vendor is not associated with this agrivet.']);
        }

        try {
            // Update pivot status to inactive
            $agrivet->vendors()->updateExistingPivot($vendorId, [
                'status' => 'inactive',
            ]);

            // Redirect based on current user's role
            $currentUser = auth()->user();
            $redirectRoute = $currentUser->user_type === 'admin' 
                ? 'dashboard.admin.agrivets.vendors.index' 
                : 'dashboard.super-admin.agrivets.vendors.index';

            return redirect()->route($redirectRoute, $id)
                ->with('success', 'Vendor removed from agrivet successfully.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Failed to remove vendor. Please try again.']);
        }
    }

    /**
     * Add an existing vendor to agrivet.
     */
    public function addExistingVendor(Request $request, $id)
    {
        $agrivet = Agrivet::findOrFail($id);

        $request->validate([
            'vendor_id' => 'required|exists:users,id',
        ]);

        $vendor = User::findOrFail($request->vendor_id);

        // Verify vendor is actually a vendor type
        if ($vendor->user_type !== 'vendor') {
            return redirect()->back()
                ->withErrors(['error' => 'Selected user is not a vendor.']);
        }

        // Check if vendor is already associated
        if ($agrivet->vendors()->where('users.id', $vendor->id)->exists()) {
            return redirect()->back()
                ->withErrors(['error' => 'Vendor is already associated with this agrivet.']);
        }

        try {
            // Associate vendor with agrivet
            $agrivet->vendors()->attach($vendor->id, [
                'status' => 'active',
            ]);

            // Redirect based on current user's role
            $currentUser = auth()->user();
            $redirectRoute = $currentUser->user_type === 'admin' 
                ? 'dashboard.admin.agrivets.vendors.index' 
                : 'dashboard.super-admin.agrivets.vendors.index';

            return redirect()->route($redirectRoute, $id)
                ->with('success', 'Vendor added to agrivet successfully.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Failed to add vendor. Please try again.']);
        }
    }
}
