<?php

namespace App\Http\Controllers;

use App\Models\Address;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AddressController extends Controller
{
    /**
     * Fetch all addresses
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $query = Address::with(['user']);

        // Filter by user_id if provided
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by address_type if provided
        if ($request->has('address_type')) {
            $query->where('address_type', $request->address_type);
        }

        // Filter by is_active if provided
        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        // Filter by city_municipality if provided
        if ($request->has('city_municipality')) {
            $query->where('city_municipality', 'like', '%' . $request->city_municipality . '%');
        }

        // Order by is_default first, then by created_at descending
        $query->orderBy('is_default', 'desc')->orderBy('created_at', 'desc');

        $addresses = $query->get();

        return response()->json([
            'success' => true,
            'data' => $addresses,
            'count' => $addresses->count()
        ]);
    }

    /**
     * Fetch a single address by ID
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $address = Address::with(['user'])->find($id);

        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Address not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $address
        ]);
    }

    /**
     * Get addresses for a specific user
     *
     * @param int $userId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getByUser($userId)
    {
        $addresses = Address::where('user_id', $userId)
            ->where('is_active', true)
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $addresses,
            'count' => $addresses->count()
        ]);
    }

    /**
     * Get default address for a specific user
     *
     * @param int $userId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getDefault($userId)
    {
        $address = Address::where('user_id', $userId)
            ->where('is_default', true)
            ->where('is_active', true)
            ->first();

        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'No default address found for this user'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $address
        ]);
    }

    /**
     * Create a new address
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'address_label' => 'required|string|max:50',
            'address_type' => 'nullable|in:home,work,farm,other',
            'recipient_name' => 'required|string|max:100',
            'contact_number' => 'required|string|max:20',
            'region' => 'nullable|string|max:100',
            'province' => 'nullable|string|max:100',
            'city_municipality' => 'required|string|max:100',
            'barangay' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:10',
            'street_address' => 'required|string|max:255',
            'full_address' => 'nullable|string',
            'additional_notes' => 'nullable|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // If this is set as default, unset all other default addresses for this user
        if ($request->is_default) {
            Address::where('user_id', $request->user_id)
                ->update(['is_default' => false]);
        }

        // If this is the first address for the user, set it as default
        $existingAddresses = Address::where('user_id', $request->user_id)->count();
        $isDefault = $request->is_default ?? ($existingAddresses === 0);

        // Build full_address from components if not provided
        $fullAddress = $request->full_address;
        if (!$fullAddress) {
            $parts = array_filter([
                $request->street_address,
                $request->barangay,
                $request->city_municipality,
                $request->province,
                $request->region,
                $request->postal_code,
            ]);
            $fullAddress = implode(', ', $parts);
        }

        // Create new address
        $address = Address::create([
            'user_id' => $request->user_id,
            'address_label' => $request->address_label,
            'address_type' => $request->address_type ?? 'home',
            'recipient_name' => $request->recipient_name,
            'contact_number' => $request->contact_number,
            'region' => $request->region,
            'province' => $request->province,
            'city_municipality' => $request->city_municipality,
            'barangay' => $request->barangay,
            'postal_code' => $request->postal_code,
            'street_address' => $request->street_address,
            'full_address' => $fullAddress,
            'additional_notes' => $request->additional_notes,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'is_default' => $isDefault,
            'is_active' => $request->is_active ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Address created successfully',
            'data' => $address->load(['user'])
        ], 201);
    }

    /**
     * Update an address
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $address = Address::find($id);

        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Address not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'address_label' => 'sometimes|string|max:50',
            'address_type' => 'sometimes|nullable|in:home,work,farm,other',
            'recipient_name' => 'sometimes|string|max:100',
            'contact_number' => 'sometimes|string|max:20',
            'region' => 'sometimes|nullable|string|max:100',
            'province' => 'sometimes|nullable|string|max:100',
            'city_municipality' => 'sometimes|string|max:100',
            'barangay' => 'sometimes|nullable|string|max:100',
            'postal_code' => 'sometimes|nullable|string|max:10',
            'street_address' => 'sometimes|string|max:255',
            'full_address' => 'sometimes|nullable|string',
            'additional_notes' => 'sometimes|nullable|string',
            'latitude' => 'sometimes|nullable|numeric|between:-90,90',
            'longitude' => 'sometimes|nullable|numeric|between:-180,180',
            'is_default' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // If setting as default, unset all other default addresses for this user
        if ($request->has('is_default') && $request->is_default) {
            Address::where('user_id', $address->user_id)
                ->where('id', '!=', $id)
                ->update(['is_default' => false]);
        }

        // Get the data to update
        $updateData = $request->only([
            'address_label',
            'address_type',
            'recipient_name',
            'contact_number',
            'region',
            'province',
            'city_municipality',
            'barangay',
            'postal_code',
            'street_address',
            'full_address',
            'additional_notes',
            'latitude',
            'longitude',
            'is_default',
            'is_active',
        ]);

        // Rebuild full_address if any address component was updated and full_address wasn't explicitly provided
        $addressComponents = ['street_address', 'barangay', 'city_municipality', 'province', 'region', 'postal_code'];
        $hasAddressUpdate = !empty(array_intersect(array_keys($updateData), $addressComponents));
        
        if ($hasAddressUpdate && !$request->has('full_address')) {
            $parts = array_filter([
                $request->street_address ?? $address->street_address,
                $request->barangay ?? $address->barangay,
                $request->city_municipality ?? $address->city_municipality,
                $request->province ?? $address->province,
                $request->region ?? $address->region,
                $request->postal_code ?? $address->postal_code,
            ]);
            $updateData['full_address'] = implode(', ', $parts);
        }

        $address->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Address updated successfully',
            'data' => $address->load(['user'])
        ]);
    }

    /**
     * Set an address as default
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function setDefault($id)
    {
        $address = Address::find($id);

        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Address not found'
            ], 404);
        }

        // Use the model's setAsDefault method
        $address->setAsDefault();

        return response()->json([
            'success' => true,
            'message' => 'Address set as default successfully',
            'data' => $address->fresh()->load(['user'])
        ]);
    }

    /**
     * Delete an address (set is_active to false and soft delete)
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $address = Address::find($id);

        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Address not found'
            ], 404);
        }

        $wasDefault = $address->is_default;
        $userId = $address->user_id;

        // Set is_active to false and remove default status
        $address->update([
            'is_active' => false,
            'is_default' => false,
        ]);

        // Soft delete the address
        $address->delete();

        // If deleted address was default, set another active address as default
        if ($wasDefault) {
            $newDefault = Address::where('user_id', $userId)
                ->where('is_active', true)
                ->orderBy('created_at', 'desc')
                ->first();

            if ($newDefault) {
                $newDefault->update(['is_default' => true]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Address deleted successfully'
        ]);
    }

    /**
     * Restore a deleted address (restore soft delete and set is_active to true)
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function restore($id)
    {
        $address = Address::withTrashed()->find($id);

        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Address not found'
            ], 404);
        }

        if (!$address->trashed() && $address->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Address is already active'
            ], 400);
        }

        // Restore from soft delete if trashed
        if ($address->trashed()) {
            $address->restore();
        }

        // Set is_active to true
        $address->update(['is_active' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Address restored successfully',
            'data' => $address->load(['user'])
        ]);
    }

    /**
     * Get available address types
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAddressTypes()
    {
        return response()->json([
            'success' => true,
            'data' => Address::getAddressTypes()
        ]);
    }
}

