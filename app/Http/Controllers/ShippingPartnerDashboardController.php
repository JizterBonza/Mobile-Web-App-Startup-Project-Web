<?php

namespace App\Http\Controllers;

use App\Models\FarmOrder;
use App\Models\User;
use App\Services\FarmCheckoutService;
use App\Services\FarmOrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ShippingPartnerDashboardController extends Controller
{
    public function __construct(private readonly FarmOrderService $orders) {}

    public function index(Request $request)
    {
        $cards = $this->cards($request->user());

        return Inertia::render('Dashboard/ShippingPartnerDashboard', [
            'orders' => $cards,
            'stats' => [
                'assigned' => count($cards),
                'needsSchedule' => count(array_filter($cards, fn (array $order) => $order['canSchedule'] && ! $order['pickupDate'])),
                'scheduled' => count(array_filter($cards, fn (array $order) => $order['pickupDate'] && ! $order['onHold'])),
                'onHold' => count(array_filter($cards, fn (array $order) => $order['onHold'])),
            ],
        ]);
    }

    public function schedule(Request $request, int $orderId)
    {
        $input = $request->validate([
            'per_box_fee' => 'required|numeric|min:0|max:99999999.99|decimal:0,2',
            'pickup_date' => 'required|date_format:Y-m-d',
        ]);

        $order = $this->orders->accessible($request->user(), $orderId);
        abort_unless($order->fulfillment_method === 'delivery', 422, 'This is not a delivery order.');

        try {
            $this->orders->schedule(
                $order,
                $request->user(),
                $input['pickup_date'],
                FarmCheckoutService::cents($input['per_box_fee']),
            );
        } catch (HttpException $exception) {
            return back()->withErrors([
                'schedule' => $exception->getMessage() ?: 'The shipping schedule could not be saved.',
            ])->withInput();
        }

        return back()->with('success', 'Pickup date and shipping fee saved. The farm and customer have been notified.');
    }

    public function pickup(Request $request, int $orderId)
    {
        try {
            $this->orders->markPickedUp($this->orders->accessible($request->user(), $orderId), $request->user());
        } catch (HttpException $exception) {
            return back()->withErrors(['schedule' => $exception->getMessage() ?: 'This order cannot be picked up.']);
        }

        return back()->with('success', 'Order is in transit.');
    }

    public function deliver(Request $request, int $orderId)
    {
        try {
            $this->orders->markDelivered($this->orders->accessible($request->user(), $orderId), $request->user());
        } catch (HttpException $exception) {
            return back()->withErrors(['schedule' => $exception->getMessage() ?: 'This order cannot be marked delivered.']);
        }

        return back()->with('success', 'Order marked delivered.');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function cards(User $user): array
    {
        if (! Schema::hasTable('farm_orders')) {
            return [];
        }

        return FarmOrder::query()
            ->with(['order.orderDetail', 'items', 'events'])
            ->whereNotNull('deposit_paid_at')
            ->where(function ($query) use ($user) {
                $query->where('shipping_partner_id', $user->id)
                    ->orWhere(function ($query) {
                        $query->whereNull('shipping_partner_id')
                            ->where('fulfillment_method', 'delivery')
                            ->where('status', 'prepared');
                    });
            })
            ->latest('id')
            ->get()
            ->sortBy(fn (FarmOrder $order) => $order->status === 'prepared' ? 0 : 1)
            ->values()
            ->map(fn (FarmOrder $order) => $this->card($order))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function card(FarmOrder $order): array
    {
        $farm = is_array($order->farm_snapshot) ? $order->farm_snapshot : [];
        $address = is_array($order->address_snapshot) ? $order->address_snapshot : [];
        $soonest = Carbon::now('Asia/Manila')->startOfDay()->addDays(2)->toDateString();
        $release = $order->earliest_release_date?->toDateString();
        $minPickupDate = ($release && $release > $soonest) ? $release : $soonest;
        $onHold = $order->held_at !== null;
        $prepared = $order->events->contains(fn ($event) => $event->event === 'preparing_completed');
        $canSchedule = $prepared
            && $order->fulfillment_method === 'delivery'
            && $order->pickup_date === null
            && $order->confirmed_at !== null
            && $order->deposit_paid_at !== null
            && $order->cancelled_at === null
            && $order->fully_paid_at === null
            && ! $onHold;

        return [
            'id' => (int) $order->order_id,
            'orderCode' => $order->order?->orderDetail?->order_code ?: 'FARM-'.$order->order_id,
            'status' => (string) $order->status,
            'farmName' => $farm['name'] ?? 'Farm',
            'farmLocation' => $this->locationLine($farm, false),
            'deliveryAddress' => $this->locationLine($address, true),
            'birdCount' => (int) $order->bird_count,
            'boxCount' => (int) $order->box_count,
            'estimateMin' => FarmCheckoutService::money($order->estimate_min_cents),
            'estimateMax' => FarmCheckoutService::money($order->estimate_max_cents),
            'perBoxFee' => FarmCheckoutService::money($order->per_box_cents),
            'shippingFee' => FarmCheckoutService::money($order->shipping_cents),
            'pickupDate' => $order->pickup_date?->toDateString(),
            'earliestReleaseDate' => $release,
            'minPickupDate' => $minPickupDate,
            'items' => $order->items->map(function ($item) {
                $snapshot = is_array($item->snapshot) ? $item->snapshot : [];
                $birds = is_array($snapshot['birds'] ?? null) ? $snapshot['birds'] : [];

                return [
                    'name' => $snapshot['name'] ?? 'Gamefowl',
                    'quantity' => (int) $item->quantity,
                    'birdCount' => (int) $item->bird_count,
                    'sellingUnit' => $snapshot['selling_unit'] ?? null,
                    'birds' => array_values(array_map(fn ($bird) => [
                        'wingband' => is_array($bird) ? ($bird['wingband_no'] ?? '') : '',
                        'featherColor' => is_array($bird) ? ($bird['feather_color'] ?? '') : '',
                        'feetColor' => is_array($bird) ? ($bird['feet_color'] ?? '') : '',
                    ], $birds)),
                ];
            })->values()->all(),
            'prepared' => $prepared,
            'confirmed' => $order->confirmed_at !== null,
            'onHold' => $onHold,
            'holdReason' => $order->hold_reason,
            'fullyPaid' => $order->fully_paid_at !== null,
            'cancelled' => $order->cancelled_at !== null,
            'canSchedule' => $canSchedule,
            'canPickUp' => $order->status === 'ready_for_release' && ! $onHold && $order->cancelled_at === null,
            'canDeliver' => $order->status === 'in_transit' && $order->cancelled_at === null,
        ];
    }

    /**
     * @param  array<string, mixed>  $snapshot
     */
    private function locationLine(array $snapshot, bool $includeRecipient): string
    {
        $keys = $includeRecipient
            ? ['recipient_name', 'street_address', 'full_address', 'address', 'barangay', 'city_municipality', 'city', 'province']
            : ['address', 'street_address', 'full_address', 'barangay', 'city', 'city_municipality', 'province'];
        $parts = [];
        foreach ($keys as $key) {
            $value = trim((string) ($snapshot[$key] ?? ''));
            if ($value !== '' && ! in_array($value, $parts, true)) {
                $parts[] = $value;
            }
        }

        return implode(', ', $parts);
    }
}
