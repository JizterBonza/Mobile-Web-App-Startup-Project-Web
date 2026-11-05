<?php

namespace App\Services;

use App\Models\FarmOrder;
use App\Models\FarmOrderEvent;
use App\Models\Notification;
use App\Models\Order;
use App\Models\User;
use App\Support\DisplayDateTime;
use App\Support\PublicStorage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class FarmOrderService
{
    public function accessible(User $user, int $orderId): FarmOrder
    {
        $order = FarmOrder::where('order_id', $orderId)->firstOrFail();
        $allowed = match ($user->user_type) {
            User::TYPE_CUSTOMER => (int) $order->customer_id === (int) $user->id,
            User::TYPE_OWNER_MANAGER => (int) $user->farm_id === (int) $order->farm_id && $order->deposit_paid_at !== null,
            User::TYPE_SHIPPING_PARTNER => $order->deposit_paid_at !== null && (
                (int) $order->shipping_partner_id === (int) $user->id
                || ($order->shipping_partner_id === null && $order->status === 'prepared' && $order->fulfillment_method === 'delivery')
            ),
            User::TYPE_ADMIN, User::TYPE_SUPER_ADMIN => true,
            default => false,
        };
        abort_unless($allowed, 404);

        return $order;
    }

    /**
     * Paid farm orders for the owner/manager order screen.
     *
     * @return array<int, array<string, mixed>>
     */
    public function ownerManagerCards(int $farmId): array
    {
        if (! Schema::hasTable('farm_orders')) {
            return [];
        }

        $relations = ['items.listing', 'events', 'order.orderDetail', 'payments'];
        if (Schema::hasTable('user_details') && Schema::hasColumn('users', 'user_detail_id')) {
            $relations[] = 'order.user.userDetail';
        }

        return FarmOrder::query()
            ->with($relations)
            ->where('farm_id', $farmId)
            ->whereNotNull('deposit_paid_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (FarmOrder $order) => $this->ownerManagerCard($order))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function ownerManagerCard(FarmOrder $order): array
    {
        $order->loadMissing(['items.listing', 'events', 'order.orderDetail', 'payments']);
        $detail = $order->order?->orderDetail;
        $address = is_array($order->address_snapshot) ? $order->address_snapshot : [];
        $farm = is_array($order->farm_snapshot) ? $order->farm_snapshot : [];
        $pickup = $order->fulfillment_method === 'pickup';
        $section = $this->ownerManagerSection($order);
        $releaseImmediate = $this->releaseIsImmediate($order);
        $prepared = $this->preparingCompleted($order);
        $preparedReleaseDate = $releaseImmediate ? $this->eventDate($order, 'preparing_completed') : null;
        $riderPickupDate = $releaseImmediate ? $this->riderPickupDate($order) : null;
        $delivery = $order->fulfillment_method === 'delivery';
        if ($prepared && $section['status'] === 'preparing') {
            $section['statusDescription'] = 'Prepared';
        } elseif ($section['status'] === 'preparing' && $order->status !== 'on_hold' && $releaseImmediate && ! $delivery) {
            $section['statusDescription'] = 'Immediate';
        }
        $paidCents = $this->loadedPaidCents($order);
        $customer = $this->ownerManagerCustomer($order, $address);
        $subtotal = (float) FarmCheckoutService::money($order->subtotal_cents);
        $finalTotal = $order->total_cents === null ? $subtotal : (float) FarmCheckoutService::money($order->total_cents);

        $products = $order->items->map(function ($item) use ($prepared, $section) {
            $snapshot = is_array($item->snapshot) ? $item->snapshot : [];
            $price = (float) FarmCheckoutService::money($item->unit_price_cents);

            return [
                'id' => (int) $item->id,
                'name' => $snapshot['name'] ?? 'Gamefowl',
                'quantity' => (int) $item->quantity,
                'price' => $price,
                'originalPrice' => $price,
                'discount' => 0,
                'thumbnail' => $this->catalogThumbnail($snapshot),
                'itemStatusId' => null,
                'itemStatus' => $section['status'] === 'preparing'
                    ? ($prepared ? 'Ready for Pickup' : 'Preparing')
                    : null,
                'birdCount' => (int) $item->bird_count,
            ];
        })->values()->all();

        $payload = [
            'id' => (int) $order->order_id,
            'orderType' => 'farm',
            'orderNumber' => $detail?->order_code ?: 'FARM-'.$order->order_id,
            'shopIds' => [],
            'shopNames' => array_values(array_filter([$farm['name'] ?? null])),
            'customerId' => (int) $order->customer_id,
            'customerName' => $customer['name'],
            'customerPhone' => $customer['phone'],
            'customerProfilePicture' => $customer['photo'],
            'dateOfOrder' => DisplayDateTime::toIso($order->order?->ordered_at ?? $order->created_at),
            'products' => $products,
            'displayTotal' => $finalTotal,
            'deliveryAddress' => $pickup ? [
                'street' => $farm['address'] ?? '',
                'barangay' => '',
                'city' => $farm['city'] ?? '',
                'province' => $farm['province'] ?? '',
            ] : [
                'street' => $address['street_address'] ?? ($address['full_address'] ?? ''),
                'barangay' => $address['barangay'] ?? '',
                'city' => $address['city_municipality'] ?? '',
                'province' => $address['province'] ?? '',
            ],
            'status' => $section['status'],
            'statusDescription' => $section['statusDescription'],
            'deliveryMethodId' => null,
            'deliveryMethodName' => $pickup ? 'Farm Pickup' : 'Delivery',
            'deliveryMethod' => [
                'name' => $pickup ? 'Farm Pickup' : 'Delivery',
                'info' => $pickup
                    ? 'Customer picks up from the farm.'
                    : 'Shipped after the farm confirms and a partner schedules pickup.',
            ],
            'readyButtonLabel' => null,
            'allItemsDonePreparing' => false,
            'farmSummary' => [
                'birdCount' => (int) $order->bird_count,
                'boxCount' => (int) $order->box_count,
                'deposit' => (float) FarmCheckoutService::money($order->deposit_cents),
                'amountPaid' => (float) FarmCheckoutService::money($paidCents),
                'remainingBalance' => $order->total_cents === null
                    ? null
                    : (float) FarmCheckoutService::money(max(0, $order->total_cents - $paidCents)),
                'chickenSubtotal' => $subtotal,
                'shippingFee' => $order->shipping_cents === null ? null : (float) FarmCheckoutService::money($order->shipping_cents),
                'finalTotal' => $order->total_cents === null ? null : $finalTotal,
                'pickupDate' => $order->pickup_date?->toDateString(),
                'earliestReleaseDate' => $order->earliest_release_date?->toDateString(),
                'preparedReleaseDate' => $preparedReleaseDate,
                'riderPickupDate' => $riderPickupDate,
                'releaseImmediate' => $releaseImmediate,
                'pickupImmediate' => $releaseImmediate,
                'farmLocation' => $this->farmLocationLine($farm),
                'showDonePreparing' => $section['status'] === 'preparing' && ! $prepared && ($delivery || $releaseImmediate),
                'showReadyForPickup' => $prepared && ! $delivery && ! in_array($order->status, ['ready_for_pickup', 'ready_for_release', 'release_authorized', 'in_transit', 'delivered'], true),
                'paymentStatus' => $order->fully_paid_at ? 'paid' : ($paidCents > 0 ? 'partially_paid' : 'pending'),
                'holdReason' => $order->hold_reason,
                'orderInstruction' => $detail?->order_instruction,
                'canConfirm' => $section['status'] === 'new',
            ],
        ];

        if ($section['status'] === 'completed') {
            $payload['isSuccessful'] = $section['isSuccessful'];
            $payload['completionDate'] = DisplayDateTime::toIso($order->cancelled_at ?? $order->updated_at);
        }

        return $payload;
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

    private function loadedPaidCents(FarmOrder $order): int
    {
        if (! $order->relationLoaded('payments')) {
            return $this->paidCents($order);
        }

        return FarmCheckoutService::cents(
            $order->payments
                ->whereIn('purpose', ['farm_deposit', 'farm_balance'])
                ->where('status', 'paid')
                ->sum('amount')
        );
    }

    /**
     * @return array{status: string, isSuccessful: bool|null, statusDescription: string}
     */
    private function ownerManagerSection(FarmOrder $order): array
    {
        if ($order->cancelled_at || $order->status === 'cancelled') {
            return ['status' => 'completed', 'isSuccessful' => false, 'statusDescription' => 'Cancelled'];
        }

        return match ($order->status) {
            'delivered' => ['status' => 'completed', 'isSuccessful' => true, 'statusDescription' => 'Delivered'],
            'in_transit' => ['status' => 'in-transit', 'isSuccessful' => null, 'statusDescription' => 'In Transit'],
            'ready_for_release', 'release_authorized' => ['status' => 'for-pickup', 'isSuccessful' => null, 'statusDescription' => 'Ready for Release'],
            'ready_for_pickup' => ['status' => 'for-pickup', 'isSuccessful' => null, 'statusDescription' => 'Ready for Pickup'],
            'prepared' => ['status' => 'preparing', 'isSuccessful' => null, 'statusDescription' => 'Prepared'],
            'scheduled' => ['status' => 'preparing', 'isSuccessful' => null, 'statusDescription' => 'Scheduled'],
            'awaiting_schedule' => ['status' => 'preparing', 'isSuccessful' => null, 'statusDescription' => 'Preparing'],
            'on_hold' => ['status' => 'preparing', 'isSuccessful' => null, 'statusDescription' => 'On Hold'],
            default => ['status' => 'new', 'isSuccessful' => null, 'statusDescription' => 'Awaiting Confirmation'],
        };
    }

    private function releaseIsImmediate(FarmOrder $order): bool
    {
        $order->loadMissing('items.listing');
        if ($order->items->isEmpty()) {
            return false;
        }

        return $order->items->every(function ($item) {
            $snapshot = is_array($item->snapshot) ? $item->snapshot : [];
            $option = $snapshot['release_option'] ?? $item->listing?->release_option;
            if ($option === 'Available Now') {
                $option = 'Release Immediately';
            }
            if ($option === 'Release Immediately') {
                return true;
            }
            if ($option === 'Set Release Date') {
                return false;
            }

            return empty($snapshot['release_date']);
        });
    }

    private function preparingCompleted(FarmOrder $order): bool
    {
        return $this->eventDate($order, 'preparing_completed') !== null;
    }

    private function assertAssignedPartner(FarmOrder $order, User $actor): void
    {
        abort_unless(
            $actor->user_type === User::TYPE_SHIPPING_PARTNER && (int) $order->shipping_partner_id === (int) $actor->id,
            403
        );
    }

    private function noticeFarmOwners(FarmOrder $order, string $event, string $message): void
    {
        foreach (User::where('farm_id', $order->farm_id)->where('user_type', User::TYPE_OWNER_MANAGER)->pluck('id') as $ownerId) {
            $this->notice($order, (int) $ownerId, $event, $message);
        }
    }

    /**
     * @param  array<string, mixed>  $farm
     */
    private function farmLocationLine(array $farm): string
    {
        $parts = [];
        foreach (['address', 'street_address', 'barangay', 'city', 'city_municipality', 'province'] as $key) {
            $value = trim((string) ($farm[$key] ?? ''));
            if ($value !== '' && ! in_array($value, $parts, true)) {
                $parts[] = $value;
            }
        }

        return implode(', ', $parts);
    }

    private function preparedNotice(FarmOrder $order): string
    {
        $order->loadMissing('items');
        $items = $order->items->map(function ($item) {
            $snapshot = is_array($item->snapshot) ? $item->snapshot : [];
            $name = $snapshot['name'] ?? 'Gamefowl';

            return $name.' x '.(int) $item->quantity.' ('.(int) $item->bird_count.' birds)';
        })->implode('; ');
        $farm = is_array($order->farm_snapshot) ? $order->farm_snapshot : [];
        $place = trim(($farm['name'] ?? 'Farm').($this->farmLocationLine($farm) !== '' ? ' — '.$this->farmLocationLine($farm) : ''));

        return "Items are prepared. Use these details for the shipping fee. Items: {$items}. Location: {$place}.";
    }

    private function riderPickupDate(FarmOrder $order): ?string
    {
        foreach (['rider_picked_up', 'picked_up', 'out_for_delivery'] as $event) {
            $date = $this->eventDate($order, $event);
            if ($date !== null) {
                return $date;
            }
        }

        return null;
    }

    private function eventDate(FarmOrder $order, string $event): ?string
    {
        $events = $order->relationLoaded('events') ? $order->events : $order->events()->get();
        $match = $events->first(fn ($row) => $row->event === $event);
        if (! $match?->created_at) {
            return null;
        }

        return Carbon::parse($match->created_at)->timezone('Asia/Manila')->toDateString();
    }

    /**
     * @param  array<string, mixed>  $address
     * @return array{name: string, phone: string, photo: string|null}
     */
    private function ownerManagerCustomer(FarmOrder $order, array $address): array
    {
        $detail = null;
        if (Schema::hasTable('user_details') && Schema::hasColumn('users', 'user_detail_id')) {
            $detail = $order->order?->user?->userDetail;
        }

        $name = trim((string) (($detail->first_name ?? '').' '.($detail->last_name ?? '')));
        if ($name === '') {
            $name = trim((string) ($address['recipient_name'] ?? ''));
        }

        $photo = $detail?->profile_image_url ?: $detail?->avatar;

        return [
            'name' => $name !== '' ? $name : 'Customer',
            'phone' => (string) ($address['contact_number'] ?? $detail?->mobile_number ?? ''),
            'photo' => PublicStorage::url(is_string($photo) ? $photo : null),
        ];
    }

    /**
     * @param  array<string, mixed>  $snapshot
     */
    private function catalogThumbnail(array $snapshot): ?string
    {
        $catalog = $snapshot['catalog'] ?? [];
        if (! is_array($catalog)) {
            return null;
        }

        foreach ($catalog as $entry) {
            $images = is_array($entry) ? ($entry['images'] ?? []) : [];
            if (! is_array($images)) {
                continue;
            }
            foreach ($images as $image) {
                $path = is_string($image) ? $image : (is_array($image) ? ($image['url'] ?? $image['path'] ?? null) : null);
                $url = PublicStorage::url(is_string($path) ? $path : null);
                if ($url) {
                    return $url;
                }
            }
        }

        return null;
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
                if ($order->shipping_partner_id && $order->fulfillment_method === 'delivery') {
                    $this->notice($order, $order->shipping_partner_id, 'farm_confirmed', 'The farm accepted the order. You will be notified when the items are prepared.');
                }
            }

            return $order;
        });
    }

    public function markPrepared(FarmOrder $order, User $actor): FarmOrder
    {
        return DB::transaction(function () use ($order, $actor) {
            $order = FarmOrder::lockForUpdate()->findOrFail($order->id);
            $order->load(['items.listing', 'events']);
            abort_unless($actor->user_type === User::TYPE_OWNER_MANAGER && (int) $actor->farm_id === (int) $order->farm_id, 403);
            abort_unless($order->deposit_paid_at && $order->confirmed_at && ! $order->cancelled_at, 409, 'Confirm the order before marking it done preparing.');
            abort_unless(in_array($order->status, ['awaiting_schedule', 'prepared', 'scheduled'], true), 409, 'Only orders being prepared can be marked as done.');
            $delivery = $order->fulfillment_method === 'delivery';
            abort_unless($delivery || $this->releaseIsImmediate($order), 409, 'Done Preparing is available when the pickup date is immediate.');
            if (! $this->preparingCompleted($order)) {
                $order->update(['status' => 'prepared']);
                $this->event($order, 'preparing_completed', $actor);
                $this->notice($order, $order->customer_id, 'preparing_completed', 'The farm finished preparing your order.');
                if ($delivery) {
                    $message = $this->preparedNotice($order);
                    $partnerIds = $order->shipping_partner_id
                        ? [(int) $order->shipping_partner_id]
                        : User::where('user_type', User::TYPE_SHIPPING_PARTNER)->where('status', 'active')->pluck('id')->map(fn ($id) => (int) $id)->all();
                    foreach ($partnerIds as $partnerId) {
                        $this->notice($order, $partnerId, 'preparing_completed', $message);
                    }
                }
            }

            return $order->refresh();
        });
    }

    public function markReadyForPickup(FarmOrder $order, User $actor): FarmOrder
    {
        return DB::transaction(function () use ($order, $actor) {
            $order = FarmOrder::lockForUpdate()->findOrFail($order->id);
            $order->load('events');
            abort_unless($actor->user_type === User::TYPE_OWNER_MANAGER && (int) $actor->farm_id === (int) $order->farm_id, 403);
            abort_unless($order->deposit_paid_at && $order->confirmed_at && ! $order->cancelled_at, 409, 'Confirm the order before marking it ready for pickup.');
            abort_unless(in_array($order->status, ['awaiting_schedule', 'prepared', 'scheduled'], true), 409, 'Only orders being prepared can be marked ready for pickup.');
            abort_unless($order->fulfillment_method !== 'delivery', 409, 'The shipping partner marks delivery orders ready for pickup.');
            abort_unless($this->preparingCompleted($order), 409, 'Mark the order done preparing first.');
            $order->update(['status' => 'ready_for_pickup']);
            $this->event($order, 'ready_for_pickup', $actor);
            $this->notice($order, $order->customer_id, 'ready_for_pickup', 'The farm marked your order ready for pickup.');

            return $order->refresh();
        });
    }

    public function markPickedUp(FarmOrder $order, User $actor): FarmOrder
    {
        return DB::transaction(function () use ($order, $actor) {
            $order = FarmOrder::lockForUpdate()->findOrFail($order->id);
            $this->assertAssignedPartner($order, $actor);
            abort_unless($order->status === 'ready_for_release' && $order->fully_paid_at && ! $order->cancelled_at && ! $order->held_at, 409, 'Pick up the order after the customer pays and it is ready for release.');
            $order->update(['status' => 'in_transit']);
            $this->event($order, 'picked_up', $actor);
            $this->notice($order, $order->customer_id, 'in_transit', 'Your order has been picked up and is in transit.');
            $this->noticeFarmOwners($order, 'in_transit', 'The shipping partner picked up the order. It is now in transit.');

            return $order->refresh();
        });
    }

    public function markDelivered(FarmOrder $order, User $actor): FarmOrder
    {
        return DB::transaction(function () use ($order, $actor) {
            $order = FarmOrder::lockForUpdate()->findOrFail($order->id);
            $this->assertAssignedPartner($order, $actor);
            abort_unless($order->status === 'in_transit' && ! $order->cancelled_at, 409, 'Only orders in transit can be marked delivered.');
            $order->update(['status' => 'delivered']);
            $this->event($order, 'delivered', $actor);
            $this->notice($order, $order->customer_id, 'delivered', 'Your order has been delivered.');
            $this->noticeFarmOwners($order, 'delivered', 'The shipping partner marked the order delivered.');

            return $order->refresh();
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
                $message = $this->preparingCompleted($order)
                    ? $this->preparedNotice($order)
                    : 'A farm order has been assigned to you. You will be notified when the items are prepared.';
                $this->notice($order, $partnerId, 'order_assigned', $message);
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
            $claiming = $actor->user_type === User::TYPE_SHIPPING_PARTNER && ! $order->shipping_partner_id;
            $order->update([
                'per_box_cents' => $rate, 'shipping_cents' => $shipping,
                'total_cents' => $order->subtotal_cents + $shipping, 'pickup_date' => $pickupDate,
                'balance_opens_at' => $date->copy()->subDays(7)->startOfDay()->utc(),
                'balance_due_at' => $date->copy()->subDay()->endOfDay()->utc(),
                'schedule_version' => $order->schedule_version + 1,
                'held_at' => null, 'hold_reason' => null,
                'shipping_partner_id' => $claiming ? $actor->id : $order->shipping_partner_id,
                'status' => $order->fulfillment_method === 'delivery' ? 'ready_for_pickup' : 'scheduled',
            ]);
            if ($claiming) {
                $this->event($order, 'shipping_partner_assigned', $actor, ['shipping_partner_id' => $actor->id]);
            }
            $order->order->orderDetail->update([
                'shipping_fee' => FarmCheckoutService::money($shipping),
                'total_amount' => FarmCheckoutService::money($order->total_cents),
            ]);
            $this->event($order, 'shipping_confirmed', $actor, [
                'pickup_date' => $pickupDate, 'per_box_fee' => FarmCheckoutService::money($rate),
                'shipping_fee' => FarmCheckoutService::money($shipping),
            ]);
            $fee = FarmCheckoutService::money($shipping);
            $remaining = FarmCheckoutService::money(max(0, (int) $order->total_cents - $this->paidCents($order)));
            $this->notice($order, $order->customer_id, 'balance_due', "Pickup is set for {$pickupDate}. Please pay the remaining balance of {$remaining}.");
            foreach (User::where('farm_id', $order->farm_id)->where('user_type', User::TYPE_OWNER_MANAGER)->pluck('id') as $ownerId) {
                $this->notice($order, (int) $ownerId, 'pickup_date_set', "Pickup is set for {$pickupDate}. Shipping fee is {$fee}.");
            }
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
            ? $actor->user_type === User::TYPE_SHIPPING_PARTNER && (
                (int) $order->shipping_partner_id === (int) $actor->id
                || ($order->shipping_partner_id === null && $order->status === 'prepared')
            )
            : $actor->user_type === User::TYPE_OWNER_MANAGER && (int) $actor->farm_id === (int) $order->farm_id;
        abort_unless($allowed || $admin, 403);
        abort_unless($order->confirmed_at && $order->deposit_paid_at && ! $order->cancelled_at, 409, 'Farm confirmation and deposit are required.');
        if ($order->fulfillment_method === 'delivery' && ! $admin) {
            abort_unless($this->preparingCompleted($order), 409, 'The farm must finish preparing the order before pickup can be scheduled.');
        }
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
                'held_at' => null, 'hold_reason' => null,
                'status' => $order->fulfillment_method === 'delivery' ? 'ready_for_pickup' : 'scheduled',
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
            $order->update(['release_authorized_at' => now(), 'status' => 'ready_for_release']);
            $this->event($order, 'release_authorized');
            foreach ($this->recipients($order) as $id) {
                $this->notice($order, $id, 'release_authorized', 'The customer paid in full. The order is ready for release.');
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
