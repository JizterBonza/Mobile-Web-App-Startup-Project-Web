<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\EnsuresApiOwnership;
use App\Models\Address;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AddressController extends Controller
{
    use EnsuresApiOwnership;

    public function index(Request $request)
    {
        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $query = Address::with(['user'])
            ->where('user_id', $this->authUserId($request));

        if ($request->has('address_type')) {
            $query->where('address_type', $request->address_type);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        if ($request->has('city_municipality')) {
            $query->where('city_municipality', 'like', '%' . $request->city_municipality . '%');
        }

        $query->orderBy('is_default', 'desc')->orderBy('created_at', 'desc');

        $addresses = $query->get();

        return response()->json([
            'success' => true,
            'data' => $addresses,
            'count' => $addresses->count()
        ]);
    }

    public function show(Request $request, $id)
    {
        $address = Address::with(['user'])->find($id);

        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Address not found'
            ], 404);
        }

        if ($response = $this->ensureResourceOwner($request, $address->user_id)) {
            return $response;
        }

        return response()->json([
            'success' => true,
            'data' => $address
        ]);
    }

    public function getByUser(Request $request, $userId)
    {
        if ($response = $this->ensureSelfOrStaff($request, $userId)) {
            return $response;
        }

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

    public function getDefault(Request $request, $userId)
    {
        if ($response = $this->ensureSelfOrStaff($request, $userId)) {
            return $response;
        }

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

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'sometimes|integer',
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

        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $userId = $this->authUserId($request);

        if ($request->is_default) {
            Address::where('user_id', $userId)
                ->update(['is_default' => false]);
        }

        $existingAddresses = Address::where('user_id', $userId)->count();
        $isDefault = $request->is_default ?? ($existingAddresses === 0);

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

        $address = Address::create([
            'user_id' => $userId,
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

    public function update(Request $request, $id)
    {
        $address = Address::find($id);

        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Address not found'
            ], 404);
        }

        if ($response = $this->ensureResourceOwner($request, $address->user_id)) {
            return $response;
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

        if ($request->has('is_default') && $request->is_default) {
            Address::where('user_id', $address->user_id)
                ->where('id', '!=', $id)
                ->update(['is_default' => false]);
        }

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

    public function setDefault(Request $request, $id)
    {
        $address = Address::find($id);

        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Address not found'
            ], 404);
        }

        if ($response = $this->ensureResourceOwner($request, $address->user_id)) {
            return $response;
        }

        $address->setAsDefault();

        return response()->json([
            'success' => true,
            'message' => 'Address set as default successfully',
            'data' => $address->fresh()->load(['user'])
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $address = Address::find($id);

        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Address not found'
            ], 404);
        }

        if ($response = $this->ensureResourceOwner($request, $address->user_id)) {
            return $response;
        }

        $wasDefault = $address->is_default;
        $userId = $address->user_id;

        $address->update([
            'is_active' => false,
            'is_default' => false,
        ]);

        $address->delete();

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

    public function restore(Request $request, $id)
    {
        $address = Address::withTrashed()->find($id);

        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Address not found'
            ], 404);
        }

        if ($response = $this->ensureResourceOwner($request, $address->user_id)) {
            return $response;
        }

        if (!$address->trashed() && $address->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Address is already active'
            ], 400);
        }

        if ($address->trashed()) {
            $address->restore();
        }

        $address->update(['is_active' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Address restored successfully',
            'data' => $address->load(['user'])
        ]);
    }

    public function getAddressTypes()
    {
        return response()->json([
            'success' => true,
            'data' => Address::getAddressTypes()
        ]);
    }
}
