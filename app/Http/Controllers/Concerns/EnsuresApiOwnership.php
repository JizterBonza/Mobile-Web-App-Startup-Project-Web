<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

trait EnsuresApiOwnership
{
    protected function authUserId(Request $request): int
    {
        return (int) $request->user()->id;
    }

    /**
     * Reject when a client-supplied user_id does not match the authenticated user.
     */
    protected function rejectUserIdMismatch(Request $request, mixed $providedUserId = null): ?JsonResponse
    {
        if ($providedUserId === null || $providedUserId === '') {
            return null;
        }

        if ((int) $providedUserId !== $this->authUserId($request)) {
            return response()->json([
                'success' => false,
                'message' => 'user_id does not match the authenticated user.',
            ], 403);
        }

        return null;
    }

    /**
     * Path/body target user must be the authenticated user (staff may override).
     */
    protected function ensureSelfOrStaff(Request $request, mixed $targetUserId): ?JsonResponse
    {
        $auth = $request->user();

        if ((int) $targetUserId === (int) $auth->id || $this->isStaff($auth)) {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'You are not authorized to access this resource.',
        ], 403);
    }

    protected function ensureResourceOwner(Request $request, mixed $ownerUserId): ?JsonResponse
    {
        if ((int) $ownerUserId === $this->authUserId($request) || $this->isStaff($request->user())) {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'You are not authorized to access this resource.',
        ], 403);
    }

    protected function ensureSelfOrStaffOrSameRider(Request $request, mixed $riderId): ?JsonResponse
    {
        $auth = $request->user();

        if ((int) $riderId === (int) $auth->id || $this->isStaff($auth)) {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'You are not authorized to access this resource.',
        ], 403);
    }

    protected function userCanAccessOrder(User $user, Order $order): bool
    {
        if ((int) $order->user_id === (int) $user->id || $this->isStaff($user)) {
            return true;
        }

        if ($order->relationLoaded('orderShops')) {
            return $order->orderShops->contains(
                fn ($os) => $os->rider_id !== null && (int) $os->rider_id === (int) $user->id
            );
        }

        return $order->orderShops()->where('rider_id', $user->id)->exists();
    }

    protected function forbidUnlessOrderAccess(Request $request, Order $order): ?JsonResponse
    {
        if ($this->userCanAccessOrder($request->user(), $order)) {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'You are not authorized to access this order.',
        ], 403);
    }

    protected function ensureStaffOrVendor(Request $request): ?JsonResponse
    {
        $user = $request->user();

        if ($this->isStaff($user) || $user->user_type === 'vendor' || $user->user_type === 'owner_manager') {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'You are not authorized to perform this action.',
        ], 403);
    }

    protected function ensureStaff(Request $request): ?JsonResponse
    {
        if ($this->isStaff($request->user())) {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'You are not authorized to perform this action.',
        ], 403);
    }

    protected function ensureRiderOrStaff(Request $request): ?\Illuminate\Http\JsonResponse
    {
        $user = $request->user();

        if ($this->isStaff($user) || $user->user_type === 'rider') {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'You are not authorized to perform this action.',
        ], 403);
    }
}
