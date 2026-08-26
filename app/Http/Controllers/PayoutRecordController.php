<?php

namespace App\Http\Controllers;

use App\Models\Payout;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PayoutRecordController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        abort_unless($this->canViewPayoutRecords($user), 403);

        $request->validate([
            'shop_id' => 'nullable|integer|exists:shops,id',
            'status' => 'nullable|string|max:20',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = Payout::query()
            ->visibleTo($user)
            ->with(['shop:id,shop_name']);

        if ($request->filled('shop_id')) {
            $query->where('shop_id', $request->integer('shop_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->date('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->date('to_date'));
        }

        $payouts = $query
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 20))
            ->withQueryString()
            ->through(fn (Payout $payout) => [
                'id' => $payout->id,
                'reference_number' => $payout->reference_number,
                'amount' => $payout->amount,
                'currency' => $payout->currency,
                'provider' => $payout->provider,
                'status' => $payout->status,
                'destination_account_number' => $payout->destination_account_number,
                'destination_account_name' => $payout->destination_account_name,
                'destination_account_bic' => $payout->destination_account_bic,
                'shop' => $payout->shop
                    ? [
                        'id' => $payout->shop->id,
                        'shop_name' => $payout->shop->shop_name,
                    ]
                    : null,
                'created_at' => $payout->created_at?->toIso8601String(),
            ]);

        $canFilterShops = in_array($user->user_type, [User::TYPE_SUPER_ADMIN, User::TYPE_ADMIN, User::TYPE_OWNER_MANAGER], true);

        return Inertia::render('Dashboard/PayoutRecords', [
            'payouts' => $payouts,
            'shops' => $canFilterShops ? $this->filterShops($user) : [],
            'canFilterShops' => $canFilterShops,
            'filters' => $request->only(['shop_id', 'status', 'from_date', 'to_date', 'per_page']),
        ]);
    }

    private function canViewPayoutRecords(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return in_array($user->user_type, [
            User::TYPE_SUPER_ADMIN,
            User::TYPE_ADMIN,
            User::TYPE_OWNER_MANAGER,
            User::TYPE_VENDOR,
        ], true);
    }

    /**
     * @return list<array{id: int, shop_name: string}>
     */
    private function filterShops(User $user): array
    {
        $query = Shop::query()->orderBy('shop_name');

        if ($user->user_type === User::TYPE_OWNER_MANAGER) {
            if (! $user->agrivet_id) {
                return [];
            }

            $query->where('agrivet_id', $user->agrivet_id);
        }

        return $query
            ->get(['id', 'shop_name'])
            ->map(fn (Shop $shop) => [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
            ])
            ->values()
            ->all();
    }
}
