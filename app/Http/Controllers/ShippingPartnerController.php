<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\ShippingPartner;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShippingPartnerController extends Controller
{
    /**
     * List shipping companies and the login connected to each one.
     */
    public function index()
    {
        $partners = ShippingPartner::with('user.userDetail')
            ->orderBy('name')
            ->get()
            ->map(function (ShippingPartner $partner) {
                $user = $partner->user;
                $detail = $user?->userDetail;
                $linkedName = $detail
                    ? trim(implode(' ', array_filter([
                        $detail->first_name,
                        $detail->middle_name,
                        $detail->last_name,
                    ])))
                    : null;

                return [
                    'id' => $partner->id,
                    'name' => $partner->name,
                    'registered_business_name' => $partner->registered_business_name,
                    'address' => $partner->address,
                    'city' => $partner->city,
                    'province' => $partner->province,
                    'contact_number' => $partner->contact_number,
                    'email' => $partner->email,
                    'service_area' => $partner->service_area,
                    'permits' => $partner->permits,
                    'owner_name' => $partner->owner_name,
                    'status' => $partner->status,
                    'created_at' => $partner->created_at?->format('Y-m-d H:i:s'),
                    'linked_user_name' => $linkedName !== '' ? $linkedName : null,
                    'linked_user_email' => $detail?->email,
                    'linked_user_status' => $user?->status,
                ];
            });

        return Inertia::render('Dashboard/ShippingPartners', [
            'partners' => $partners,
        ]);
    }

    /**
     * Company details and the logins connected to it.
     */
    public function show(int $id)
    {
        $partner = ShippingPartner::with(['users.userDetail', 'users.userCredential'])->findOrFail($id);

        $users = $partner->users
            ->sortByDesc(fn (User $user) => $user->created_at?->getTimestamp() ?? 0)
            ->values()
            ->map(function (User $user) {
                $detail = $user->userDetail;
                $name = $detail
                    ? trim(implode(' ', array_filter([
                        $detail->first_name,
                        $detail->middle_name,
                        $detail->last_name,
                    ])))
                    : '';

                return [
                    'id' => $user->id,
                    'name' => $name !== '' ? $name : null,
                    'email' => $detail?->email,
                    'mobile_number' => $detail?->mobile_number,
                    'username' => $user->userCredential?->username,
                    'user_type' => $user->user_type,
                    'status' => $user->status,
                    'created_at' => $user->created_at?->format('Y-m-d H:i:s'),
                ];
            });

        return Inertia::render('Dashboard/ShippingPartnerShow', [
            'partner' => [
                'id' => $partner->id,
                'name' => $partner->name,
                'registered_business_name' => $partner->registered_business_name,
                'owner_name' => $partner->owner_name,
                'address' => $partner->address,
                'city' => $partner->city,
                'province' => $partner->province,
                'contact_number' => $partner->contact_number,
                'email' => $partner->email,
                'service_area' => $partner->service_area,
                'permits' => $partner->permits,
                'status' => $partner->status,
                'created_at' => $partner->created_at?->format('Y-m-d H:i:s'),
                'users' => $users,
            ],
        ]);
    }

    /**
     * Update company details, or only the active status when the list toggle is used.
     */
    public function update(Request $request, int $id)
    {
        $partner = ShippingPartner::findOrFail($id);
        $oldValues = $partner->toArray();

        if (! $request->exists('name')) {
            $validated = $request->validate([
                'status' => 'required|string|in:active,inactive',
            ]);

            $partner->update(['status' => $validated['status']]);

            ActivityLog::log(
                'updated',
                "Shipping partner status updated: {$partner->name}",
                $partner,
                $oldValues,
                $partner->fresh()->toArray()
            );

            return redirect()->route($this->indexRoute())
                ->with('success', 'Shipping partner status updated.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'registered_business_name' => 'nullable|string|max:255',
            'owner_name' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'province' => 'nullable|string|max:100',
            'contact_number' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'service_area' => 'nullable|string|max:255',
            'permits' => 'nullable|string',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        $partner->update([
            'name' => $validated['name'],
            'registered_business_name' => $validated['registered_business_name'] ?? null,
            'owner_name' => $validated['owner_name'] ?? null,
            'address' => $validated['address'] ?? null,
            'city' => $validated['city'] ?? null,
            'province' => $validated['province'] ?? null,
            'contact_number' => $validated['contact_number'] ?? null,
            'email' => $validated['email'] ?? null,
            'service_area' => $validated['service_area'] ?? null,
            'permits' => $validated['permits'] ?? null,
            'status' => $validated['status'] ?? $partner->status,
        ]);

        ActivityLog::log(
            'updated',
            "Shipping partner updated: {$partner->name}",
            $partner,
            $oldValues,
            $partner->fresh()->toArray()
        );

        return redirect()->route($this->indexRoute())
            ->with('success', 'Shipping partner updated successfully.');
    }

    /**
     * Mark the shipping partner inactive. The connected login stays in Accounts.
     */
    public function destroy(int $id)
    {
        $partner = ShippingPartner::findOrFail($id);
        $oldValues = $partner->toArray();

        $partner->update(['status' => 'inactive']);

        ActivityLog::log(
            'deactivated',
            "Shipping partner deactivated: {$partner->name}",
            $partner,
            $oldValues,
            $partner->fresh()->toArray()
        );

        return redirect()->route($this->indexRoute())
            ->with('success', 'Shipping partner deactivated successfully.');
    }

    private function indexRoute(): string
    {
        return auth()->user()->user_type === 'admin'
            ? 'dashboard.admin.shipping-partners.index'
            : 'dashboard.super-admin.shipping-partners.index';
    }
}
