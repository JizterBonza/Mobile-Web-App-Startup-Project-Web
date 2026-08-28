<?php

namespace App\Services;

use App\Models\OrderLog;
use App\Models\OrderShop;
use App\Models\OrderStatus;
use App\Models\ProofOfDelivery;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class OrderStatusTransitionService
{
    public function __construct(
        private readonly OrderStatusCustomerMessageService $customerMessages,
        private readonly ShopWalletService $shopWallets,
    ) {}

    /**
     * @param  array{
     *     notes?: string|null,
     *     reason?: string|null,
     *     force?: bool,
     *     source?: string,
     *     proof_verified?: bool,
     *     metadata?: array<string, mixed>
     * }  $options
     * @return array{changed: bool, order_shop: OrderShop, log: OrderLog|null}
     */
    public function transition(
        int|OrderShop $orderShop,
        int $newStatusId,
        User $actor,
        array $options = [],
    ): array {
        $result = DB::transaction(function () use ($orderShop, $newStatusId, $actor, $options) {
            $orderShopId = $orderShop instanceof OrderShop ? (int) $orderShop->id : $orderShop;
            $leg = OrderShop::query()
                ->with(['order.orderDetail', 'shop'])
                ->lockForUpdate()
                ->find($orderShopId);

            if (! $leg) {
                throw ValidationException::withMessages([
                    'shop_id' => ['The selected shop does not belong to this order.'],
                ]);
            }

            $fromStatus = OrderStatus::query()->find($leg->order_status);
            $toStatus = OrderStatus::query()
                ->whereKey($newStatusId)
                ->where('is_active', true)
                ->first();

            if (! $toStatus) {
                throw ValidationException::withMessages([
                    'status' => ['The selected order status is inactive or does not exist.'],
                ]);
            }

            if (! $this->userCanAccessLeg($actor, $leg)) {
                throw new AuthorizationException('You are not authorized to access this shop order.');
            }

            if ((int) $leg->order_status === (int) $toStatus->id) {
                return ['changed' => false, 'order_shop' => $leg, 'log' => null];
            }

            $force = (bool) ($options['force'] ?? false);
            $reason = trim((string) ($options['reason'] ?? ''));
            if ($force) {
                if (! $this->isAdmin($actor)) {
                    throw new AuthorizationException('Only administrators may force an order status correction.');
                }
                if ($reason === '') {
                    throw ValidationException::withMessages([
                        'reason' => ['A reason is required for an administrative status override.'],
                    ]);
                }
            } else {
                $this->authorizeNormalTransition(
                    $leg,
                    $fromStatus?->stat_description ?? '',
                    $toStatus->stat_description,
                    $actor,
                    (bool) ($options['proof_verified'] ?? false),
                );
            }

            $fromName = $fromStatus?->stat_description;
            $toName = $toStatus->stat_description;
            $event = $force
                ? 'admin_override'
                : ($this->statusKey($toName) === 'cancelled' ? 'cancelled' : 'status_changed');
            $notes = $force ? $reason : ($options['notes'] ?? null);
            $metadata = array_merge($options['metadata'] ?? [], [
                'source' => $options['source'] ?? 'api',
            ]);
            if ($force) {
                $metadata['admin_override'] = true;
            }

            $leg->forceFill([
                'order_status' => $toStatus->id,
            ])->save();

            $log = $this->createLog(
                $leg,
                $event,
                $fromName,
                $toName,
                $actor,
                is_string($notes) ? $notes : null,
                $metadata,
            );

            if ($this->statusKey($toName) === 'in-transit') {
                ProofOfDelivery::query()->firstOrCreate(
                    ['order_shop_id' => $leg->id, 'status' => 'pending'],
                    [
                        'order_id' => $leg->order_id,
                        'rider_id' => $leg->rider_id,
                        'latitude' => null,
                        'longitude' => null,
                        'image_path' => null,
                        'remarks' => null,
                    ],
                );
            }

            DB::afterCommit(function () use ($leg, $toStatus, $actor) {
                try {
                    $this->shopWallets->syncUncreditedSales([(int) $leg->shop_id]);
                } catch (\Throwable $e) {
                    Log::error('Order status changed but shop wallet synchronization failed.', [
                        'order_id' => $leg->order_id,
                        'order_shop_id' => $leg->id,
                        'error' => $e->getMessage(),
                    ]);
                }

                try {
                    $this->customerMessages->notifyForStatusId(
                        (int) $leg->order_id,
                        [(int) $leg->shop_id],
                        (int) $toStatus->id,
                        $actor,
                    );
                } catch (\Throwable $e) {
                    Log::warning('Order status changed but customer notification failed.', [
                        'order_id' => $leg->order_id,
                        'order_shop_id' => $leg->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            });

            return ['changed' => true, 'order_shop' => $leg, 'log' => $log];
        });

        $result['order_shop']->refresh()->loadMissing(['status', 'shop']);

        return $result;
    }

    /**
     * Record a non-transition lifecycle event, such as a failed delivery attempt.
     *
     * @param  array<string, mixed>  $metadata
     */
    public function recordEvent(
        OrderShop $orderShop,
        string $event,
        User $actor,
        ?string $notes = null,
        array $metadata = [],
    ): OrderLog {
        $orderShop->loadMissing('status');

        return $this->createLog(
            $orderShop,
            $event,
            $orderShop->status?->stat_description,
            $orderShop->status?->stat_description,
            $actor,
            $notes,
            $metadata,
        );
    }

    /**
     * Assign a set of ready shop legs to a rider as one all-or-nothing operation.
     *
     * @param  array<int, int|string>  $orderShopIds
     * @return array{
     *     order_id: int,
     *     rider_id: int,
     *     order_shop_ids: array<int, int>,
     *     newly_assigned_order_shop_ids: array<int, int>,
     *     already_assigned_order_shop_ids: array<int, int>
     * }
     */
    public function acceptForDelivery(int $orderId, array $orderShopIds, User $actor): array
    {
        if ($actor->user_type !== User::TYPE_RIDER) {
            throw new AuthorizationException('Only riders may accept orders for delivery.');
        }

        $ids = collect($orderShopIds)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->sort()
            ->values()
            ->all();

        $readyStatus = OrderStatus::query()
            ->where('stat_description', 'Ready for Delivery')
            ->where('is_active', true)
            ->first();

        if (! $readyStatus) {
            throw ValidationException::withMessages([
                'order_shop_ids' => ['The Ready for Delivery status is unavailable.'],
            ]);
        }

        return DB::transaction(function () use ($actor, $ids, $orderId, $readyStatus) {
            $legs = OrderShop::query()
                ->whereIn('id', $ids)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($legs->count() !== count($ids)
                || $legs->contains(fn (OrderShop $leg) => (int) $leg->order_id !== $orderId)
            ) {
                throw ValidationException::withMessages([
                    'order_shop_ids' => ['Every selected shop leg must belong to this order.'],
                ]);
            }

            $unavailable = $legs->filter(function (OrderShop $leg) use ($actor, $readyStatus) {
                $assignedToAnotherRider = $leg->rider_id !== null
                    && (int) $leg->rider_id !== (int) $actor->id;

                return (int) $leg->order_status !== (int) $readyStatus->id
                    || $assignedToAnotherRider;
            });

            if ($unavailable->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'order_shop_ids' => ['One or more selected shop pickups are no longer available.'],
                ])->status(409);
            }

            $legs->load('status');
            $newlyAssigned = [];
            $alreadyAssigned = [];

            foreach ($legs as $leg) {
                if ($leg->rider_id !== null) {
                    $alreadyAssigned[] = (int) $leg->id;

                    continue;
                }

                $leg->forceFill(['rider_id' => $actor->id])->save();
                $this->recordEvent(
                    $leg,
                    'rider_assigned',
                    $actor,
                    'Rider accepted this shop pickup.',
                    [
                        'source' => 'api',
                        'rider_id' => (int) $actor->id,
                    ],
                );
                $newlyAssigned[] = (int) $leg->id;
            }

            return [
                'order_id' => $orderId,
                'rider_id' => (int) $actor->id,
                'order_shop_ids' => $ids,
                'newly_assigned_order_shop_ids' => $newlyAssigned,
                'already_assigned_order_shop_ids' => $alreadyAssigned,
            ];
        });
    }

    public function createInitialLog(OrderShop $orderShop, ?User $actor = null): OrderLog
    {
        $orderShop->loadMissing('status');

        return $this->createLog(
            $orderShop,
            'order_created',
            null,
            $orderShop->status?->stat_description ?? 'Pending',
            $actor,
            'Order shop leg created.',
            ['source' => 'checkout'],
        );
    }

    public function userManagesShop(User $user, OrderShop $orderShop): bool
    {
        if ($this->isAdmin($user)) {
            return true;
        }

        if ($user->user_type === User::TYPE_OWNER_MANAGER) {
            $orderShop->loadMissing('shop');

            return $orderShop->shop
                && (int) $orderShop->shop->agrivet_id === (int) $user->agrivet_id;
        }

        if ($user->user_type === User::TYPE_VENDOR) {
            return DB::table('agrivet_vendor')
                ->where('vendor_id', $user->id)
                ->where('shop_id', $orderShop->shop_id)
                ->where('status', 'active')
                ->exists();
        }

        return false;
    }

    private function authorizeNormalTransition(
        OrderShop $leg,
        string $fromStatus,
        string $toStatus,
        User $actor,
        bool $proofVerified,
    ): void {
        $from = $this->statusKey($fromStatus);
        $to = $this->statusKey($toStatus);
        $isAdmin = $this->isAdmin($actor);
        $isShopStaff = $this->userManagesShop($actor, $leg);
        $isCustomer = (int) $leg->order->user_id === (int) $actor->id;
        $isAssignedRider = $actor->user_type === User::TYPE_RIDER
            && $leg->rider_id !== null
            && (int) $leg->rider_id === (int) $actor->id;

        $allowed = match (true) {
            $from === 'pending' && $to === 'preparing' => $isShopStaff || $isAdmin,
            $from === 'pending' && $to === 'cancelled' => $isCustomer || $isShopStaff || $isAdmin,
            $from === 'preparing' && $to === $this->expectedReadyStatus($leg) => $isShopStaff || $isAdmin,
            in_array($from, ['ready for delivery', 'ready for drop off'], true) && $to === 'in-transit' => $isAssignedRider || $isAdmin,
            $from === 'in-transit' && $to === 'delivered' => ($isAssignedRider || $isAdmin) && $proofVerified,
            $from === 'ready for pickup' && $to === 'delivered' => $isShopStaff || $isAdmin,
            default => false,
        };

        if (! $allowed) {
            if ($from === 'in-transit' && $to === 'delivered' && ! $proofVerified) {
                throw ValidationException::withMessages([
                    'status' => ['Proof of delivery is required before marking this order as delivered.'],
                ]);
            }

            throw new AuthorizationException(
                "You are not allowed to change this shop order from {$fromStatus} to {$toStatus}."
            );
        }
    }

    private function expectedReadyStatus(OrderShop $leg): string
    {
        $description = DB::table('orders')
            ->join('order_details', 'orders.order_detail_id', '=', 'order_details.id')
            ->join('delivery_method', 'order_details.delivery_method_id', '=', 'delivery_method.id')
            ->where('orders.id', $leg->order_id)
            ->value('delivery_method.description');

        return match ($this->statusKey((string) $description)) {
            'no contact' => 'ready for drop off',
            'pickup from store' => 'ready for pickup',
            default => 'ready for delivery',
        };
    }

    /** @param array<string, mixed> $metadata */
    private function createLog(
        OrderShop $leg,
        string $event,
        ?string $fromStatus,
        ?string $toStatus,
        ?User $actor,
        ?string $notes,
        array $metadata,
    ): OrderLog {
        $request = request();

        return OrderLog::create([
            'order_id' => $leg->order_id,
            'order_shop_id' => $leg->id,
            'event' => $event,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'user_id' => $actor?->id,
            'notes' => $notes,
            'metadata' => $metadata,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }

    private function isAdmin(User $user): bool
    {
        return in_array($user->user_type, [User::TYPE_SUPER_ADMIN, User::TYPE_ADMIN], true);
    }

    private function userCanAccessLeg(User $user, OrderShop $leg): bool
    {
        if ($this->isAdmin($user)
            || (int) $leg->order->user_id === (int) $user->id
            || $this->userManagesShop($user, $leg)
        ) {
            return true;
        }

        return $user->user_type === User::TYPE_RIDER
            && $leg->rider_id !== null
            && (int) $leg->rider_id === (int) $user->id;
    }

    private function statusKey(string $status): string
    {
        $status = strtolower(trim($status));
        $status = str_replace(['_', '–', '—'], '-', $status);
        $status = preg_replace('/\s+/', ' ', $status) ?? $status;

        return $status;
    }
}
