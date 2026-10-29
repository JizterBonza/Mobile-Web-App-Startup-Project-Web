<?php

namespace App\Services;

use App\Models\Address;
use App\Models\Farm;
use App\Models\FarmCartItem;
use App\Models\FarmGamefowlListing;
use App\Models\FarmOrder;
use App\Models\GamefowlCatalog;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FarmCheckoutService
{
    public static function cents(mixed $amount): int
    {
        return (int) round((float) $amount * 100, 0, PHP_ROUND_HALF_UP);
    }

    public static function money(?int $cents): ?string
    {
        return $cents === null ? null : number_format($cents / 100, 2, '.', '');
    }

    public static function birdsPerUnit(string $unit): int
    {
        return match ($unit) {
            'per head' => 1, 'per pair' => 2, 'per trio' => 3,
            'per quadruplet' => 4, 'per dozen' => 12,
            default => abort(422, 'This listing has an unsupported selling unit.'),
        };
    }

    public function cart(User $user): array
    {
        return FarmCartItem::with(['listing.farm', 'listing.gamefowl'])
            ->where('user_id', $user->id)->orderBy('id')->get()
            ->groupBy(fn ($entry) => $entry->listing->farm_id)
            ->map(fn ($entries, $farmId) => [
                'farm_id' => (int) $farmId,
                'farm_name' => $entries->first()->listing->farm->name,
                'items' => $entries->map(function ($entry) {
                    $listing = $entry->listing;
                    $birds = $entry->quantity * self::birdsPerUnit($listing->selling_unit);

                    return [
                        'id' => $entry->id, 'listing_id' => $listing->id,
                        'name' => $listing->is_bundle ? $listing->bundle_name : $listing->gamefowl?->name,
                        'quantity' => $entry->quantity, 'selling_unit' => $listing->selling_unit,
                        'bird_count' => $birds, 'unit_price' => self::money(self::cents($listing->price)),
                        'available_birds' => max(0, $listing->stock - $listing->reserved_stock),
                        'available' => $listing->status === 'active' && $listing->farm->status === 'active'
                            && $listing->stock - $listing->reserved_stock >= $birds,
                        'release_date' => $listing->release_date?->toDateString(),
                    ];
                })->values()->all(),
            ])->values()->all();
    }

    public function putCart(User $user, int $listingId, int $quantity, bool $merge = true): FarmCartItem
    {
        return DB::transaction(function () use ($user, $listingId, $quantity, $merge) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $listing = FarmGamefowlListing::with('farm')->findOrFail($listingId);
            abort_unless($listing->status === 'active' && $listing->farm?->status === 'active', 422, 'Listing is unavailable.');
            $entry = FarmCartItem::firstOrNew(['user_id' => $user->id, 'listing_id' => $listingId]);
            $entry->quantity = $quantity + ($merge ? (int) $entry->quantity : 0);
            abort_if($entry->quantity > 100000, 422, 'Quantity is too large.');
            abort_if($entry->quantity * self::birdsPerUnit($listing->selling_unit) > $listing->stock - $listing->reserved_stock,
                409, 'Insufficient available birds.');
            $entry->save();

            return $entry;
        });
    }

    public function quote(User $user, array $input): array
    {
        $snapshot = $this->snapshot($user, $input);
        $token = Crypt::encryptString(json_encode([
            'customer_id' => $user->id, 'expires_at' => now()->addMinutes(10)->timestamp,
            'input' => $input, 'snapshot' => $snapshot,
        ], JSON_THROW_ON_ERROR));

        return [
            'farm_id' => $snapshot['farm_id'], 'items' => array_map(fn ($item) => array_merge($item, [
                'unit_price' => self::money($item['unit_price_cents']),
                'line_total' => self::money($item['unit_price_cents'] * $item['quantity']),
            ]), $snapshot['items']),
            'bird_count' => $snapshot['bird_count'], 'box_count' => $snapshot['box_count'],
            'chicken_subtotal' => self::money($snapshot['subtotal_cents']),
            'deposit_due' => self::money($snapshot['deposit_cents']),
            'shipping_estimate_min' => self::money($snapshot['estimate_min_cents']),
            'shipping_estimate_max' => self::money($snapshot['estimate_max_cents']),
            'estimated_total_min' => self::money($snapshot['subtotal_cents'] + $snapshot['estimate_min_cents']),
            'estimated_total_max' => self::money($snapshot['subtotal_cents'] + $snapshot['estimate_max_cents']),
            'final_shipping_fee' => $input['fulfillment_method'] === 'pickup' ? '0.00' : null,
            'earliest_release_date' => $snapshot['earliest_release_date'],
            'pickup_location' => $snapshot['farm_snapshot'],
            'currency' => 'PHP', 'quote_token' => $token, 'expires_in_seconds' => 600,
        ];
    }

    public function create(User $user, string $token, string $key): array
    {
        return DB::transaction(function () use ($user, $token, $key) {
            // Serializes idempotency and cart changes for this customer on MySQL.
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $hash = hash('sha256', $token);
            $existing = FarmOrder::where('customer_id', $user->id)->where('idempotency_key', $key)->first();
            if ($existing) {
                abort_unless(hash_equals($existing->request_hash, $hash), 409, 'Idempotency key was used with different input.');

                return [$existing, false];
            }
            try {
                $quote = json_decode(Crypt::decryptString($token), true, 512, JSON_THROW_ON_ERROR);
            } catch (DecryptException|\JsonException $e) {
                abort(422, 'Invalid quote token.');
            }
            abort_unless(($quote['customer_id'] ?? null) === $user->id, 403, 'Quote belongs to another customer.');
            abort_if(($quote['expires_at'] ?? 0) <= now()->timestamp, 409, 'Quote expired. Request a new quote.');
            $input = $quote['input'];
            $snapshot = $this->snapshot($user, $input, true);
            abort_unless(json_encode($snapshot) === json_encode($quote['snapshot']), 409, 'Checkout changed. Request a new quote.');

            $pickup = $input['fulfillment_method'] === 'pickup';
            $method = DB::table('delivery_method')->where('status', true)
                ->whereIn('description', $pickup ? ['Pickup from Store'] : ['Standard', 'Contact', 'Delivery'])
                ->orderBy('id')->value('id');
            abort_unless($method, 422, 'The selected fulfillment method is not configured.');
            $detail = OrderDetail::create([
                'order_code' => 'FARM-'.Str::upper(Str::random(14)),
                'subtotal' => self::money($snapshot['subtotal_cents']),
                'shipping_fee' => $pickup ? 0 : null,
                'total_amount' => $pickup ? self::money($snapshot['subtotal_cents']) : null,
                'address_id' => $pickup ? null : $input['shipping_address_id'],
                'shipping_address' => $snapshot['address_snapshot']['full_address'] ?? $snapshot['farm_snapshot']['address'] ?? '',
                'order_instruction' => $input['order_instruction'] ?? null,
                'delivery_method_id' => $method, 'payment_method' => null, 'payment_status' => 'pending',
            ]);
            $order = Order::create(['user_id' => $user->id, 'order_detail_id' => $detail->id, 'ordered_at' => now()]);
            $farmOrder = FarmOrder::create(array_merge(collect($snapshot)->except('items')->all(), [
                'order_id' => $order->id, 'customer_id' => $user->id,
                'idempotency_key' => $key, 'request_hash' => $hash,
                'fulfillment_method' => $input['fulfillment_method'],
                'shipping_cents' => $pickup ? 0 : null,
                'total_cents' => $pickup ? $snapshot['subtotal_cents'] : null,
            ]))->refresh();
            foreach ($snapshot['items'] as $item) {
                $farmOrder->items()->create([
                    'listing_id' => $item['listing_id'], 'quantity' => $item['quantity'],
                    'bird_count' => $item['bird_count'], 'unit_price_cents' => $item['unit_price_cents'],
                    'snapshot' => $item,
                ]);
                FarmGamefowlListing::whereKey($item['listing_id'])->increment('reserved_stock', $item['bird_count']);
            }
            // A payment request is persisted with the order; provider I/O happens later.
            Payment::create([
                'order_id' => $order->id, 'purpose' => 'farm_deposit',
                'amount' => self::money($snapshot['deposit_cents']), 'currency' => 'PHP',
                'status' => 'awaiting_session', 'provider' => 'paymongo', 'schedule_version' => 0,
                'metadata' => ['farm_order' => true],
            ]);
            FarmCartItem::where('user_id', $user->id)->whereIn('id', $input['cart_item_ids'])->delete();
            app(FarmOrderService::class)->event($farmOrder, 'order_created', $user, ['deposit_due' => self::money($snapshot['deposit_cents'])]);

            return [$farmOrder, true];
        }, 3);
    }

    private function snapshot(User $user, array $input, bool $lock = false): array
    {
        $cartQuery = FarmCartItem::where('user_id', $user->id)->whereIn('id', $input['cart_item_ids'])->orderBy('id');
        $entries = ($lock ? $cartQuery->lockForUpdate() : $cartQuery)->get();
        abort_unless($entries->count() === count($input['cart_item_ids']), 422, 'Select cart items belonging to this customer.');
        $farmQuery = Farm::where('status', 'active')->whereKey($input['farm_id']);
        $farm = ($lock ? $farmQuery->lockForUpdate() : $farmQuery)->firstOrFail();
        $query = FarmGamefowlListing::with('gamefowl')->whereIn('id', $entries->pluck('listing_id'))->orderBy('id');
        $listings = ($lock ? $query->lockForUpdate() : $query)->get()->keyBy('id');
        $subtotal = $birds = 0;
        $release = Carbon::now('Asia/Manila')->startOfDay();
        $items = [];
        foreach ($entries as $entry) {
            $listing = $listings->get($entry->listing_id);
            abort_unless($listing && (int) $listing->farm_id === (int) $farm->id && $listing->status === 'active',
                422, 'All selected listings must be active and belong to one farm.');
            $catalogIds = $listing->is_bundle ? $listing->bundle_catalog_ids : [$listing->gamefowl_catalog_id];
            abort_unless($catalogIds && GamefowlCatalog::whereIn('id', $catalogIds)->where('status', 'active')->count() === count(array_unique($catalogIds)),
                422, 'A gamefowl in this listing is unavailable.');
            $count = $entry->quantity * self::birdsPerUnit($listing->selling_unit);
            abort_if($listing->stock - $listing->reserved_stock < $count, 409, 'Insufficient available birds.');
            $price = self::cents($listing->price);
            if ($listing->release_option === 'Set Release Date') {
                abort_unless($listing->release_date, 422, 'Listing release date is missing.');
                $release = $release->max(Carbon::parse($listing->release_date->toDateString(), 'Asia/Manila'));
            }
            $subtotal += $price * $entry->quantity;
            $birds += $count;
            $items[] = [
                'listing_id' => $listing->id, 'quantity' => $entry->quantity,
                'bird_count' => $count, 'unit_price_cents' => $price,
                'name' => $listing->is_bundle ? $listing->bundle_name : $listing->gamefowl->name,
                'selling_unit' => $listing->selling_unit, 'is_bundle' => (bool) $listing->is_bundle,
                'bundle_catalog_ids' => $listing->bundle_catalog_ids ?? [],
                'release_date' => $listing->release_date?->toDateString(),
                'catalog' => GamefowlCatalog::whereIn('id', $catalogIds)->orderBy('id')->get(['id', 'name', 'sex', 'images'])->toArray(),
            ];
        }
        abort_if($subtotal < 2 || $subtotal > 9999999999, 422, 'Chicken subtotal is outside the supported payment range.');
        $address = null;
        if ($input['fulfillment_method'] === 'delivery') {
            $address = Address::where('user_id', $user->id)->where('is_active', true)->find($input['shipping_address_id']);
            abort_unless($address, 422, 'Delivery address must be an active address belonging to this customer.');
        }
        $boxes = (int) ceil($birds / 2);

        return [
            'farm_id' => $farm->id, 'bird_count' => $birds, 'box_count' => $boxes,
            'subtotal_cents' => $subtotal, 'deposit_cents' => (int) round($subtotal * 0.3, 0, PHP_ROUND_HALF_UP),
            'estimate_min_cents' => $address ? $boxes * 250000 : 0,
            'estimate_max_cents' => $address ? $boxes * 350000 : 0,
            'earliest_release_date' => $release->toDateString(),
            'farm_snapshot' => $farm->only(['id', 'name', 'address', 'city', 'province', 'contact_number', 'latitude', 'longitude']),
            'address_snapshot' => $address?->only(['id', 'recipient_name', 'contact_number', 'full_address', 'street_address', 'barangay', 'city_municipality', 'province', 'postal_code', 'latitude', 'longitude']),
            'items' => $items,
        ];
    }
}
