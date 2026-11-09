<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\ShippingPartner;
use App\Models\User;
use App\Models\UserCredential;
use App\Models\UserDetail;
use App\Services\UserWelcomeEmailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
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
            ->map(fn (User $user) => $this->presentUser($user));

        $availableUsers = User::with(['userDetail', 'userCredential', 'managedShippingPartner'])
            ->where('user_type', User::TYPE_SHIPPING_PARTNER)
            ->where(function ($query) use ($partner) {
                $query->whereNull('shipping_partner_id')
                    ->orWhere('shipping_partner_id', '!=', $partner->id);
            })
            ->get()
            ->map(function (User $user) {
                return array_merge($this->presentUser($user), [
                    'company_name' => $user->managedShippingPartner?->name,
                ]);
            })
            ->sortBy(fn (array $user) => strtolower($user['name'] ?? $user['email'] ?? ''))
            ->values();

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
            'availableUsers' => $availableUsers,
        ]);
    }

    /**
     * Create a shipping partner login and connect it to this company.
     */
    public function storeUser(Request $request, int $id)
    {
        $partner = ShippingPartner::findOrFail($id);

        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|string|email|max:255|unique:user_details,email',
            'mobile_number' => 'required|string|max:20',
            'password' => 'required|string|min:6|confirmed',
            'username' => 'nullable|string|max:100|unique:user_credentials,username',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        try {
            DB::beginTransaction();

            $username = $validated['username']
                ?? explode('@', $validated['email'])[0].'_'.time();

            $userDetail = UserDetail::create([
                'first_name' => $validated['first_name'],
                'middle_name' => $validated['middle_name'] ?? null,
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'mobile_number' => $validated['mobile_number'],
            ]);

            $userCredential = UserCredential::create([
                'username' => $username,
                'password_hash' => Hash::make($validated['password']),
            ]);

            $user = User::create([
                'user_detail_id' => $userDetail->id,
                'user_credential_id' => $userCredential->id,
                'status' => $validated['status'] ?? 'active',
                'user_type' => User::TYPE_SHIPPING_PARTNER,
                'shipping_partner_id' => $partner->id,
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            report($e);

            throw ValidationException::withMessages([
                'error' => 'Failed to create the shipping partner login. Please try again.',
            ]);
        }

        ActivityLog::log(
            'created',
            "Shipping partner login created for {$partner->name}: {$userDetail->email}",
            $user,
            null,
            [
                'email' => $userDetail->email,
                'user_type' => $user->user_type,
                'shipping_partner_id' => $partner->id,
            ]
        );

        $emailSent = app(UserWelcomeEmailService::class)->send($user, $username, $validated['password']);
        $name = trim(implode(' ', array_filter([
            $validated['first_name'],
            $validated['middle_name'] ?? null,
            $validated['last_name'],
        ])));

        return redirect()->route($this->showRoute(), $partner->id)
            ->with('success', UserWelcomeEmailService::successMessage(
                $emailSent,
                "{$name} was added to {$partner->name}."
            ));
    }

    /**
     * Connect an existing shipping partner login to this company.
     * A login can belong to one company, so this moves it when it is already connected elsewhere.
     */
    public function addExistingUser(Request $request, int $id)
    {
        $partner = ShippingPartner::findOrFail($id);

        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
        ]);

        $user = User::with(['userDetail', 'managedShippingPartner'])->findOrFail($validated['user_id']);

        if ($user->user_type !== User::TYPE_SHIPPING_PARTNER) {
            throw ValidationException::withMessages([
                'user_id' => 'Selected account is not a shipping partner login.',
            ]);
        }

        if ((int) $user->shipping_partner_id === (int) $partner->id) {
            throw ValidationException::withMessages([
                'user_id' => 'This login is already connected to this company.',
            ]);
        }

        $previousPartnerId = $user->shipping_partner_id;
        $previousPartnerName = $user->managedShippingPartner?->name;

        $user->update(['shipping_partner_id' => $partner->id]);

        $name = $this->displayName($user) ?? ($user->userDetail?->email ?? "User #{$user->id}");

        ActivityLog::log(
            'updated',
            "Shipping partner login {$name} connected to {$partner->name}",
            $user,
            ['shipping_partner_id' => $previousPartnerId],
            ['shipping_partner_id' => $partner->id]
        );

        $message = $previousPartnerName
            ? "{$name} was moved from {$previousPartnerName} to {$partner->name}."
            : "{$name} was added to {$partner->name}.";

        return redirect()->route($this->showRoute(), $partner->id)
            ->with('success', $message);
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

    private function showRoute(): string
    {
        return auth()->user()->user_type === 'admin'
            ? 'dashboard.admin.shipping-partners.show'
            : 'dashboard.super-admin.shipping-partners.show';
    }

    private function displayName(User $user): ?string
    {
        $detail = $user->userDetail;
        $name = $detail
            ? trim(implode(' ', array_filter([
                $detail->first_name,
                $detail->middle_name,
                $detail->last_name,
            ])))
            : '';

        return $name !== '' ? $name : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function presentUser(User $user): array
    {
        $detail = $user->userDetail;

        return [
            'id' => $user->id,
            'name' => $this->displayName($user),
            'email' => $detail?->email,
            'mobile_number' => $detail?->mobile_number,
            'username' => $user->userCredential?->username,
            'user_type' => $user->user_type,
            'status' => $user->status,
            'created_at' => $user->created_at?->format('Y-m-d H:i:s'),
        ];
    }
}
