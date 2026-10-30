<?php

namespace App\Services;

use App\Models\FarmOrder;
use App\Models\FarmOrderEvent;
use App\Models\Notification;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class FarmOrderService
{
    public function accessible(User $user, int $orderId): FarmOrder
    {
        $order = FarmOrder::where('order_id', $orderId)->firstOrFail();
        $allowed = match ($user->user_type) {
            User::TYPE_CUSTOMER => (int) $order->customer_id === (int) $user->id,
            User::TYPE_OWNER_MANAGER => (int) $user->farm_id === (int) $order->farm_id && $order->deposit_paid_at !== null,
            User::TYPE_SHIPPING_PARTNER => (int) $order->shipping_partner_id === (int) $user->id && $order->deposit_paid_at !== null,
            User::TYPE_ADMIN, User::TYPE_SUPER_ADMIN => true,
            default => false,
        };
        abort_unless($allowed, 404);

        return $order;
    }

    public function summary(FarmOrder $order): array
    {
        $order->load(['items', 'events', 'order.orderDetail', 'payments']);
        $paid = $this->paidCents($order);
        $money = fn (?int $value) => FarmCheckoutService::money($value);

        return [
            'id' => $order->order_id, 'order_code' => $order->order->orderDetail->order_code,
            'order_type' => 'farm', 'farm_id' => $order->farm_id,
            'status' => $order->status, 'inventory_state' => $order->inventory_state,
            'fulfillment_method' => $order->fulfillment_method,
            'shipping_partner_id' => $order->shipping_partner_id,
            'farm' => $order->farm_snapshot, 'delivery_address' => $order->address_snapshot,
            'order_instruction' => $order->order->orderDetail->order_instruction,
            'items' => $order->items->map(fn ($item) => array_merge($item->snapshot, [
                'unit_price' => $money($item->unit_price_cents),
                'line_total' => $money($item->unit_price_cents * $item->quantity),
            ]))->all(),
            'bird_count' => $order->bird_count, 'box_count' => $order->box_count, 'currency' => 'PHP',
            'chicken_subtotal' => $money($order->subtotal_cents), 'deposit_due' => $money($order->deposit_cents),
            'deposit_paid' => $order->deposit_paid_at !== null,
            'shipping_estimate_min' => $money($order->estimate_min_cents),
            'shipping_estimate_max' => $money($order->estimate_max_cents),
            'estimated_total_min' => $money($order->subtotal_cents + $order->estimate_min_cents),
            'estimated_total_max' => $money($order->subtotal_cents + $order->estimate_max_cents),
            'per_box_fee' => $money($order->per_box_cents),
            'final_shipping_fee' => $money($order->shipping_cents), 'final_total' => $money($order->total_cents),
            'amount_paid' => $money($paid),
            'remaining_balance' => $order->total_cents === null ? null : $money(max(0, $order->total_cents - $paid)),
            'payment_status' => $order->fully_paid_at ? 'paid' : ($paid > 0 ? 'partially_paid' : 'pending'),
            'balance_payable' => $this->balancePayable($order),
            'earliest_release_date' => $order->earliest_release_date->toDateString(),
            'pickup_date' => $order->pickup_date?->toDateString(),
            'balance_opens_at' => $order->balance_opens_at?->toIso8601String(),
            'balance_due_at' => $order->balance_due_at?->toIso8601String(),
            'schedule_version' => $order->schedule_version,
            'reservation_expires_at' => $order->reservation_expires_at?->toIso8601String(),
            'held_at' => $order->held_at?->toIso8601String(), 'hold_reason' => $order->hold_reason,
            'release_authorized' => $order->release_authorized_at !== null && $order->held_at === null,
            'tracking' => $order->events->map(fn ($event) => [
                'event' => $event->event, 'schedule_version' => $event->schedule_version,
                'data' => $event->data, 'at' => $event->created_at->toIso8601String(),
            ])->all(),
        ];
    }

    public function paidCents(FarmOrder $order): int
    {
        return FarmCheckoutService::cents($order->payments()->whereIn('purpose', ['farm_deposit', 'farm_balance'])->where('status', 'paid')->sum('amount'));
    }

    public function balancePayable(FarmOrder $order): bool
    {
        return $order->deposit_paid_at && $order->confirmed_at && $order->balance_opens_at
            && $order->balance_due_at && $order->total_cents !== null
            && ! $order->held_at && ! $order->cancelled_at && ! $order->fully_paid_at
            && now()->gte($order->balance_opens_at) && now()->lte($order->balance_due_at);
    }

    public function confirm(FarmOrder $order, User $actor): FarmOrder
    {
        return DB::transaction(function () use ($order, $actor) {
            $order = FarmOrder::lockForUpdate()->findOrFail($order->id);
            abort_unless($actor->user_type === User::TYPE_OWNER_MANAGER && (int) $actor->farm_id === (int) $order->farm_id, 403);
            abort_unless($order->deposit_paid_at && ! $order->cancelled_at, 409, 'A verified deposit is required before confirmation.');
            if (! $order->confirmed_at) {
                $order->update(['confirmed_at' => now(), 'status' => 'awaiting_schedule']);
                $this->event($order, 'farm_confirmed', $actor);
                $this->notice($order, $order->customer_id, 'farm_confirmed', 'Farm confirmed your order.');
                if ($order->shipping_partner_id) {
                    $this->notice($order, $order->shipping_partner_id, 'farm_confirmed', 'The farm confirmed the order. Coordinate pickup and submit shipping details.');
                }
            }

            return $order;
        });
    }

    public function assign(FarmOrder $order, User $actor, int $partnerId): FarmOrder
    {
        return DB::transaction(function () use ($order, $actor, $partnerId) {
            abort_unless(in_array($actor->user_type, [User::TYPE_ADMIN, User::TYPE_SUPER_ADMIN], true), 403);
            $order = FarmOrder::lockForUpdate()->findOrFail($order->id);
            abort_unless($order->fulfillment_method === 'delivery' && $order->deposit_paid_at && ! $order->cancelled_at,
                409, 'Only delivery orders with a verified deposit can be assigned.');
            abort_if($order->pickup_date || $order->fully_paid_at, 409, 'Partner cannot be reassigned after scheduling.');
            User::where('user_type', User::TYPE_SHIPPING_PARTNER)->where('status', 'active')->findOrFail($partnerId);
            if ((int) $order->shipping_partner_id !== $partnerId) {
                $order->update(['shipping_partner_id' => $partnerId]);
                $this->event($order, 'shipping_partner_assigned', $actor, ['shipping_partner_id' => $partnerId]);
                $this->notice($order, $partnerId, 'order_assigned', 'A farm order has been assigned to you. Coordinate its pickup with the farm.');
            }

            return $order;
        });
    }

    public function schedule(FarmOrder $order, User $actor, string $pickupDate, ?int $perBoxCents): FarmOrder
    {
        $order->refresh();
        [$date, $rate, $shipping] = $this->scheduleValues($order, $actor, $pickupDate, $perBoxCents);
        if ($order->pickup_date?->toDateString() === $pickupDate && $order->per_box_cents === $rate && ! $order->held_at) {
            return $order;
        }

        $result = app(FarmPaymentService::class)->withClosedSessions($order, 'farm_balance', fn () => DB::transaction(function () use ($order, $actor, $pickupDate, $perBoxCents) {
            $order = FarmOrder::lockForUpdate()->findOrFail($order->id);
            [$date, $rate, $shipping] = $this->scheduleValues($order, $actor, $pickupDate, $perBoxCents);
            $order->update([
                'per_box_cents' => $rate, 'shipping_cents' => $shipping,
                'total_cents' => $order->subtotal_cents + $shipping, 'pickup_date' => $pickupDate,
                'balance_opens_at' => $date->copy()->subDays(7)->startOfDay()->utc(),
                'balance_due_at' => $date->copy()->subDay()->endOfDay()->utc(),
                'schedule_version' => $order->schedule_version + 1,
                'held_at' => null, 'hold_reason' => null, 'status' => 'scheduled',
            ]);
            $order->order->orderDetail->update([
                'shipping_fee' => FarmCheckoutService::money($shipping),
                'total_amount' => FarmCheckoutService::money($order->total_cents),
            ]);
            $this->event($order, 'shipping_confirmed', $actor, [
                'pickup_date' => $pickupDate, 'per_box_fee' => FarmCheckoutService::money($rate),
                'shipping_fee' => FarmCheckoutService::money($shipping),
            ]);
            $this->notice($order, $order->customer_id, 'schedule_updated', 'Your pickup schedule and final balance are confirmed. Review your order tracking.');
            $this->checkLocked($order);

            return $order->refresh();
        }));
        abort_unless($result, 409, 'Payment is paid, processing, or unverified. The schedule was not changed.');

        return $result;
    }

    private function scheduleValues(FarmOrder $order, User $actor, string $pickupDate, ?int $perBoxCents): array
    {
        $admin = in_array($actor->user_type, [User::TYPE_ADMIN, User::TYPE_SUPER_ADMIN], true);
        $allowed = $order->fulfillment_method === 'delivery'
            ? $actor->user_type === User::TYPE_SHIPPING_PARTNER && (int) $order->shipping_partner_id === (int) $actor->id
            : $actor->user_type === User::TYPE_OWNER_MANAGER && (int) $actor->farm_id === (int) $order->farm_id;
        abort_unless($allowed || $admin, 403);
        abort_unless($order->confirmed_at && $order->deposit_paid_at && ! $order->cancelled_at, 409, 'Farm confirmation and deposit are required.');
        abort_if($order->fully_paid_at, 409, 'Fully paid orders require a separate adjustment process.');
        abort_if($order->held_at && ! $admin, 409, 'An administrator must resolve this order hold.');
        $date = Carbon::createFromFormat('!Y-m-d', $pickupDate, 'Asia/Manila');
        abort_if($date->lt(Carbon::now('Asia/Manila')->startOfDay()->addDays(2)), 422, 'Pickup must be at least two calendar days ahead.');
        abort_if($pickupDate < $order->earliest_release_date->toDateString(), 422, 'Pickup cannot precede the listing release date.');
        $rate = $order->fulfillment_method === 'delivery' ? $perBoxCents : 0;
        abort_if($rate === null, 422, 'A price per box is required.');
        $shipping = $rate * $order->box_count;
        abort_if($shipping + $order->subtotal_cents > 9999999999, 422, 'Final total is too large.');

        return [$date, $rate, $shipping];
    }

    public function check(FarmOrder $order): void
    {
        DB::transaction(function () use ($order) {
            $this->checkLocked(FarmOrder::lockForUpdate()->findOrFail($order->id));
        });
    }

    public function resolveHold(FarmOrder $order, User $actor, string $pickupDate, string $reason): FarmOrder
    {
        $order->refresh();
        abort_unless(in_array($actor->user_type, [User::TYPE_ADMIN, User::TYPE_SUPER_ADMIN], true), 403);
        abort_unless($order->held_at && $order->hold_reason === 'balance_deadline_missed'
            && $order->inventory_state === 'allocated' && $order->confirmed_at, 409, 'This hold requires a separate financial or inventory review.');
        $date = Carbon::createFromFormat('!Y-m-d', $pickupDate, 'Asia/Manila');
        abort_if($date->lt(Carbon::now('Asia/Manila')->startOfDay()->addDays(2))
            || $pickupDate < $order->earliest_release_date->toDateString(), 422, 'Select a future pickup date after the release date, at least two days ahead.');

        $result = app(FarmPaymentService::class)->withClosedSessions($order, 'farm_balance', fn () => DB::transaction(function () use ($order, $actor, $pickupDate, $reason) {
            abort_unless(in_array($actor->user_type, [User::TYPE_ADMIN, User::TYPE_SUPER_ADMIN], true), 403);
            $order = FarmOrder::lockForUpdate()->findOrFail($order->id);
            abort_unless($order->held_at && $order->hold_reason === 'balance_deadline_missed'
                && $order->inventory_state === 'allocated' && $order->confirmed_at, 409, 'This hold requires a separate financial or inventory review.');
            $date = Carbon::createFromFormat('!Y-m-d', $pickupDate, 'Asia/Manila');
            abort_if($date->lt(Carbon::now('Asia/Manila')->startOfDay()->addDays(2))
                || $pickupDate < $order->earliest_release_date->toDateString(), 422, 'Select a future pickup date after the release date, at least two days ahead.');
            $order->refresh();
            $order->update([
                'pickup_date' => $pickupDate, 'balance_opens_at' => $date->copy()->subDays(7)->startOfDay()->utc(),
                'balance_due_at' => $date->copy()->subDay()->endOfDay()->utc(),
                'schedule_version' => $order->schedule_version + 1,
                'held_at' => null, 'hold_reason' => null, 'status' => 'scheduled',
            ]);
            $this->event($order, 'hold_resolved', $actor, ['reason' => $reason, 'pickup_date' => $pickupDate]);
            foreach ($this->recipients($order) as $id) {
                $this->notice($order, $id, 'schedule_updated', 'An administrator resolved the payment hold and confirmed a new pickup date.');
            }
            $this->checkLocked($order);

            return $order;
        }));
        abort_unless($result, 409, 'An existing payment is processing or cannot be verified. Try again after reconciliation.');

        return $result;
    }

    /** Caller holds the farm-order lock, before acquiring any payment locks. */
    public function checkLocked(FarmOrder $order): void
    {
        if (app(PaymentSecurityService::class)->held($order->order_id)) {
            $order->update(['held_at' => $order->held_at ?? now(), 'hold_reason' => $order->hold_reason ?? 'payment_review', 'status' => 'on_hold']);

            return;
        }
        if ($order->cancelled_at || ! $order->balance_due_at || ! $order->deposit_paid_at) {
            return;
        }
        if (! $order->fully_paid_at && now()->gt($order->balance_due_at) && ! $order->held_at) {
            $order->update(['held_at' => now(), 'hold_reason' => 'balance_deadline_missed', 'status' => 'on_hold']);
            $this->event($order, 'payment_deadline_missed');
            foreach ($this->recipients($order, true) as $id) {
                $this->notice($order, $id, 'payment_hold', 'The payment deadline was missed. Release is blocked pending admin review.');
            }
        }
        if ($this->balancePayable($order)) {
            $this->notice($order, $order->customer_id, 'balance_open', 'You can now pay your remaining chicken and shipping balance before the pickup deadline.');
        }
        if ($order->fully_paid_at && $order->confirmed_at && $order->pickup_date && $order->inventory_state === 'allocated'
            && ! $order->held_at && ! $order->release_authorized_at) {
            $order->update(['release_authorized_at' => now(), 'status' => 'release_authorized']);
            $this->event($order, 'release_authorized');
            foreach ($this->recipients($order) as $id) {
                $this->notice($order, $id, 'release_authorized', 'The order is fully paid and authorized for release on the confirmed pickup date.');
            }
        }
    }

    public function event(FarmOrder $order, string $event, ?User $actor = null, array $data = []): void
    {
        FarmOrderEvent::create([
            'farm_order_id' => $order->id, 'actor_id' => $actor?->id,
            'event' => $event, 'schedule_version' => $order->schedule_version ?? 0, 'data' => $data,
        ]);
    }

    public function recipients(FarmOrder $order, bool $includeAdmin = false): array
    {
        $ids = User::where('farm_id', $order->farm_id)->where('user_type', User::TYPE_OWNER_MANAGER)->pluck('id')->all();
        $ids[] = $order->customer_id;
        if ($order->shipping_partner_id) {
            $ids[] = $order->shipping_partner_id;
        }
        if ($includeAdmin) {
            $ids = array_merge($ids, User::whereIn('user_type', [User::TYPE_ADMIN, User::TYPE_SUPER_ADMIN])->where('status', 'active')->pluck('id')->all());
        }

        return array_values(array_unique($ids));
    }

    public function notice(FarmOrder $order, int $userId, string $event, string $message): void
    {
        $inserted = DB::table('farm_order_notices')->insertOrIgnore([
            'farm_order_id' => $order->id, 'user_id' => $userId, 'event' => $event,
            'schedule_version' => $order->schedule_version, 'created_at' => now(), 'updated_at' => now(),
        ]);
        if ($inserted) {
            Notification::createForUser(
                $userId, 'farm_'.$event, 'Farm Order Update', $message, Notification::CATEGORY_ORDER,
                $order->order, ['order_id' => $order->order_id, 'schedule_version' => $order->schedule_version],
                '/farm-orders/'.$order->order_id,
            );
        }
    }
}
