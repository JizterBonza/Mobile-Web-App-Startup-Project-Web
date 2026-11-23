<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\OrderItem;
use App\Models\Refund;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RefundController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($this->canManageRefunds($user), 403);

        $request->validate([
            'shop_id' => 'nullable|integer|exists:shops,id',
            'status' => 'nullable|string|in:pending,refunded',
            'search' => 'nullable|string|max:100',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = Refund::query()->with([
            'shop.agrivet:id,name',
            'order.orderDetail:id,order_code,payment_method,total_amount,address_id',
            'order.orderDetail.address:id,contact_number',
            'customer.userDetail:id,first_name,last_name,email,mobile_number',
            'cancelledBy.userDetail:id,first_name,last_name',
            'refundedBy.userDetail:id,first_name,last_name',
            'payment:id,amount,currency,payment_method,payment_id,status',
        ]);

        if ($request->filled('shop_id')) {
            $query->where('shop_id', $request->integer('shop_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('search')) {
            $term = '%'.trim($request->string('search')).'%';
            $query->where(function ($refunds) use ($term) {
                $refunds->whereHas('order.orderDetail', function ($detail) use ($term) {
                    $detail->where('order_code', 'like', $term);
                })->orWhereHas('shop', function ($shop) use ($term) {
                    $shop->where('shop_name', 'like', $term);
                })->orWhereHas('shop.agrivet', function ($agrivet) use ($term) {
                    $agrivet->where('name', 'like', $term);
                })->orWhereHas('customer.userDetail', function ($detail) use ($term) {
                    $detail->where('first_name', 'like', $term)
                        ->orWhere('last_name', 'like', $term)
                        ->orWhere('email', 'like', $term)
                        ->orWhere('mobile_number', 'like', $term);
                })->orWhereHas('order.orderDetail.address', function ($address) use ($term) {
                    $address->where('contact_number', 'like', $term);
                });
            });
        }

        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->date('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->date('to_date'));
        }

        $refunds = $query
            ->orderByRaw("case when status = 'pending' then 0 else 1 end")
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 20))
            ->withQueryString();

        $pageRefunds = $refunds->getCollection();
        $items = OrderItem::query()
            ->whereIn('order_id', $pageRefunds->pluck('order_id')->unique()->filter()->all())
            ->get()
            ->groupBy(fn (OrderItem $item) => $item->order_id.'-'.$item->shop_id);

        $refunds->through(function (Refund $refund) use ($items) {
            $orderCode = trim((string) ($refund->order?->orderDetail?->order_code ?? ''));
            $lines = $items->get($refund->order_id.'-'.$refund->shop_id, collect());

            return [
                'id' => $refund->id,
                'order_id' => $refund->order_id,
                'order_code' => $orderCode !== '' ? $orderCode : 'ORD-'.$refund->order_id,
                'shop' => [
                    'id' => $refund->shop_id,
                    'shop_name' => $refund->shop?->shop_name,
                    'agrivet_name' => $refund->shop?->agrivet?->name,
                ],
                'customer' => [
                    'name' => $this->personName($refund->customer),
                    'email' => $refund->customer?->userDetail?->email,
                    'mobile_number' => $refund->customer?->userDetail?->mobile_number,
                    'contact_number' => $this->customerContact($refund),
                ],
                'cancelled_by' => $this->personName($refund->cancelledBy),
                'amount' => $refund->amount,
                'merchandise_amount' => $refund->merchandise_amount,
                'currency' => $refund->currency,
                'payment_method' => $refund->payment_method,
                'payment_reference' => $refund->payment_reference,
                'paid_amount' => $refund->payment?->amount ?? $refund->order?->orderDetail?->total_amount,
                'reason' => $refund->reason,
                'status' => $refund->status,
                'refund_reference' => $refund->refund_reference,
                'admin_notes' => $refund->admin_notes,
                'refunded_by' => $this->personName($refund->refundedBy),
                'refunded_at' => $refund->refunded_at?->toIso8601String(),
                'created_at' => $refund->created_at?->toIso8601String(),
                'items' => $lines->map(fn (OrderItem $item) => [
                    'name' => $item->item_name_at_purchase ?: 'Item',
                    'quantity' => (int) $item->quantity,
                    'line_total' => round((float) $item->quantity * (float) $item->price_at_purchase, 2),
                ])->values()->all(),
            ];
        });

        $pending = Refund::query()
            ->where('status', Refund::STATUS_PENDING)
            ->selectRaw('count(*) as pending_count, coalesce(sum(amount), 0) as pending_amount')
            ->first();

        return Inertia::render('Dashboard/Refunds', [
            'refunds' => $refunds,
            'shops' => Shop::query()->orderBy('shop_name')->get(['id', 'shop_name']),
            'summary' => [
                'pending_count' => (int) ($pending->pending_count ?? 0),
                'pending_amount' => (float) ($pending->pending_amount ?? 0),
            ],
            'filters' => $request->only(['shop_id', 'status', 'search', 'from_date', 'to_date', 'per_page']),
        ]);
    }

    public function markRefunded(Request $request, Refund $refund): RedirectResponse
    {
        $user = $request->user();
        abort_unless($this->canManageRefunds($user), 403);

        $data = $request->validate([
            'refund_reference' => 'nullable|string|max:255',
            'admin_notes' => 'nullable|string|max:1000',
        ]);

        if ($refund->status === Refund::STATUS_REFUNDED) {
            return back()->with('error', 'This refund is already recorded.');
        }

        DB::transaction(function () use ($refund, $user, $data) {
            $locked = Refund::query()->whereKey($refund->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === Refund::STATUS_REFUNDED) {
                return;
            }

            $locked->forceFill([
                'status' => Refund::STATUS_REFUNDED,
                'refund_reference' => trim((string) ($data['refund_reference'] ?? '')) ?: null,
                'admin_notes' => trim((string) ($data['admin_notes'] ?? '')) ?: null,
                'refunded_by_user_id' => $user->id,
                'refunded_at' => now(),
            ])->save();

            $locked->loadMissing('order.orderDetail');
            $code = trim((string) ($locked->order?->orderDetail?->order_code ?? ''));
            $orderCode = $code !== '' ? $code : 'ORD-'.$locked->order_id;

            ActivityLog::log(
                'updated',
                "Manual refund recorded for order {$orderCode}",
                $locked,
                ['status' => Refund::STATUS_PENDING],
                [
                    'status' => Refund::STATUS_REFUNDED,
                    'amount' => $locked->amount,
                    'refund_reference' => $locked->refund_reference,
                ],
            );
        });

        return back()->with('success', 'Refund marked as sent.');
    }

    private function canManageRefunds(?User $user): bool
    {
        return $user !== null
            && in_array($user->user_type, [User::TYPE_SUPER_ADMIN, User::TYPE_ADMIN], true);
    }

    private function customerContact(Refund $refund): ?string
    {
        $addressContact = trim((string) ($refund->order?->orderDetail?->address?->contact_number ?? ''));
        if ($addressContact !== '') {
            return $addressContact;
        }

        $mobile = trim((string) ($refund->customer?->userDetail?->mobile_number ?? ''));

        return $mobile !== '' ? $mobile : null;
    }

    private function personName(?User $user): ?string
    {
        if (! $user) {
            return null;
        }

        $detail = $user->userDetail;
        $name = trim(((string) ($detail?->first_name ?? '')).' '.((string) ($detail?->last_name ?? '')));

        return $name !== '' ? $name : ($detail?->email ?: null);
    }
};
