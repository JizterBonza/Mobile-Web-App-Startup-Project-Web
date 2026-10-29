<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Payout;
use App\Models\Shop;
use App\Models\User;
use App\Services\PayoutInstructionService;
use App\Services\PayoutStatusService;
use Illuminate\Http\RedirectResponse;
use InvalidArgumentException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class PayoutRecordController extends Controller
{
    public function __construct(
        protected PayoutInstructionService $payouts,
        protected PayoutStatusService $statuses,
    ) {
    }

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
            ->withQueryString();

        $coveredSales = $this->coveredSalesFor(
            $payouts->getCollection()->pluck('id')->map(fn ($id) => (int) $id)->all()
        );

        $payouts->through(fn (Payout $payout) => [
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
            'sales' => $coveredSales[(int) $payout->id] ?? [],
            'created_at' => $payout->created_at?->toIso8601String(),
        ]);

        $canFilterShops = in_array($user->user_type, [User::TYPE_SUPER_ADMIN, User::TYPE_ADMIN, User::TYPE_OWNER_MANAGER], true);

        return Inertia::render('Dashboard/PayoutRecords', [
            'payouts' => $payouts,
            'shops' => $canFilterShops ? $this->filterShops($user) : [],
            'canFilterShops' => $canFilterShops,
            'filters' => $request->only(['shop_id', 'status', 'from_date', 'to_date', 'per_page']),
            'canRunManualPayout' => $this->canRunManualPayout($user),
        ]);
    }

    /**
     * Same disbursement as GET /api/payouts: record pending payouts and clear
     * payable shop wallet balances.
     */
    public function run(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($this->canRunManualPayout($user), 403);

        $shopIds = null;

        if ($request->filled('shop_id')) {
            $shop = Shop::find($request->integer('shop_id'));
            if (! $shop) {
                return back()->with('error', 'Shop not found.');
            }

            $shopIds = [(int) $shop->id];
        }

        $result = $this->payouts->disbursements($shopIds);
        [$flashKey, $message] = $this->manualPayoutFlash($result);

        ActivityLog::log('created', 'Manual payout run from payout records', null, null, [
            'shop_ids' => $shopIds,
            'created' => count($result['ready']),
            'skipped' => count($result['skipped']),
            'references' => array_values(array_filter(array_map(
                fn (array $payload) => $payload['reference_number'] ?? null,
                $result['ready']
            ))),
        ]);

        return back()->with($flashKey, $message);
    }

    /**
     * Same status update as POST /api/payouts/status with status=success.
     */
    public function markDone(Request $request): RedirectResponse
    {
        abort_unless($this->canRunManualPayout($request->user()), 403);

        $reference = trim((string) $request->input('reference_number'));
        if ($reference === '') {
            return back()->with('error', 'Payout reference is required.');
        }

        $payout = Payout::query()->where('reference_number', $reference)->first();
        if (! $payout) {
            return back()->with('error', 'Payout not found.');
        }

        try {
            $result = $this->statuses->apply($payout, Payout::STATUS_SUCCESS);
        } catch (InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        ActivityLog::log('updated', 'Payout marked success from payout records', $payout, null, [
            'reference_number' => $payout->reference_number,
            'previous_status' => $result['previous_status'],
            'status' => $result['payout']->status,
        ]);

        $message = $result['changed']
            ? "Payout {$payout->reference_number} is marked success."
            : "Payout {$payout->reference_number} is already success.";

        return back()->with('success', $message);
    }

    /**
     * @param  array{ready: array<int, array<string, mixed>>, skipped: array<int, array<string, mixed>>}  $result
     * @return array{0: string, 1: string}
     */
    private function manualPayoutFlash(array $result): array
    {
        $readyCount = count($result['ready']);
        $skipped = $result['skipped'];
        $skippedCount = count($skipped);

        if ($readyCount === 0 && $skippedCount === 0) {
            return ['error', 'No shops have a payable wallet balance.'];
        }

        $skippedSummary = $this->skippedPayoutSummary($skipped);

        if ($readyCount === 0) {
            return ['error', $skippedSummary];
        }

        $summary = $readyCount === 1
            ? 'Created 1 payout.'
            : "Created {$readyCount} payouts.";

        if ($skippedSummary !== '') {
            $summary .= ' '.$skippedSummary;
        }

        return ['success', $summary];
    }

    /**
     * @param  array<int, array<string, mixed>>  $skipped
     */
    private function skippedPayoutSummary(array $skipped): string
    {
        if ($skipped === []) {
            return '';
        }

        $details = collect($skipped)
            ->take(3)
            ->map(function (array $row) {
                $name = $row['shop_name'] ?? 'Shop';
                $amount = number_format((float) ($row['amount'] ?? 0), 2);
                $reason = $row['reason'] ?? 'Skipped.';

                return "{$name} (₱{$amount}) was not paid out. {$reason}";
            })
            ->implode(' ');

        $extra = count($skipped) > 3 ? ' +'.(count($skipped) - 3).' more.' : '';

        return $details.$extra;
    }

    /**
     * @param  array<int, int>  $payoutIds
     * @return array<int, list<array{order_no: string, order_id: int, customer: string, payment_id: ?string, payment_intent_id: ?string, checkout_session_id: ?string, amount: float, status: string}>>
     */
    private function coveredSalesFor(array $payoutIds): array
    {
        if ($payoutIds === []) {
            return [];
        }

        $rows = DB::table('payout_sales')
            ->join('order_items', 'order_items.id', '=', 'payout_sales.order_item_id')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('order_details', 'order_details.id', '=', 'orders.order_detail_id')
            ->leftJoin('users', 'users.id', '=', 'orders.user_id')
            ->leftJoin('user_details', 'user_details.id', '=', 'users.user_detail_id')
            ->leftJoin('order_shops', function ($join) {
                $join->on('order_shops.order_id', '=', 'orders.id')
                    ->on('order_shops.shop_id', '=', 'order_items.shop_id');
            })
            ->leftJoin('order_status', 'order_status.id', '=', 'order_shops.order_status')
            ->whereIn('payout_sales.payout_id', $payoutIds)
            ->groupBy(
                'payout_sales.payout_id',
                'orders.id',
                'order_details.order_code',
                'user_details.first_name',
                'user_details.last_name',
                'order_status.stat_description',
            )
            ->orderBy('orders.id')
            ->get([
                'payout_sales.payout_id',
                'orders.id as order_id',
                'order_details.order_code',
                'user_details.first_name',
                'user_details.last_name',
                'order_status.stat_description as status',
                DB::raw('SUM(payout_sales.amount) as amount'),
            ]);

        $payments = $this->paymentReferencesFor(
            $rows->pluck('order_id')->map(fn ($id) => (int) $id)->unique()->values()->all()
        );

        $covered = [];

        foreach ($rows as $row) {
            $name = trim(((string) ($row->first_name ?? '')).' '.((string) ($row->last_name ?? '')));
            $orderCode = trim((string) ($row->order_code ?? ''));
            $payment = $payments[(int) $row->order_id] ?? null;
            $covered[(int) $row->payout_id][] = [
                'order_no' => $orderCode !== '' ? $orderCode : '#'.$row->order_id,
                'order_id' => (int) $row->order_id,
                'customer' => $name !== '' ? $name : '—',
                'payment_id' => $this->blankToNull($payment?->payment_id),
                'payment_intent_id' => $this->blankToNull($payment?->payment_intent_id),
                'checkout_session_id' => $this->blankToNull($payment?->checkout_session_id),
                'amount' => round((float) $row->amount, 2),
                'status' => $row->status ?: '—',
            ];
        }

        return $covered;
    }

    /**
     * Prefer a paid payment when one exists. Otherwise keep the latest attempt.
     *
     * @param  array<int, int>  $orderIds
     * @return array<int, object>
     */
    private function paymentReferencesFor(array $orderIds): array
    {
        if ($orderIds === [] || ! Schema::hasTable('payments')) {
            return [];
        }

        $payments = DB::table('payments')
            ->whereIn('order_id', $orderIds)
            ->orderByDesc('id')
            ->get([
                'order_id',
                'status',
                'payment_id',
                'payment_intent_id',
                'checkout_session_id',
            ]);

        $byOrder = [];

        foreach ($payments as $payment) {
            $orderId = (int) $payment->order_id;
            $current = $byOrder[$orderId] ?? null;

            if ($current === null || ($current->status !== 'paid' && $payment->status === 'paid')) {
                $byOrder[$orderId] = $payment;
            }
        }

        return $byOrder;
    }

    private function blankToNull(mixed $value): ?string
    {
        $value = trim((string) ($value ?? ''));

        return $value === '' ? null : $value;
    }

    private function canRunManualPayout(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return in_array($user->user_type, [User::TYPE_SUPER_ADMIN, User::TYPE_ADMIN], true);
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
