<?php

namespace App\Http\Controllers;

use App\Models\FarmCartItem;
use App\Models\FarmOrder;
use App\Models\User;
use App\Services\FarmCheckoutService;
use App\Services\FarmOrderService;
use App\Services\FarmPaymentService;
use Illuminate\Http\Request;

class FarmCheckoutController extends Controller
{
    public function __construct(
        private readonly FarmCheckoutService $checkout,
        private readonly FarmOrderService $orders,
        private readonly FarmPaymentService $payments,
    ) {}

    private function customer(Request $request): User
    {
        abort_unless($request->user()->user_type === User::TYPE_CUSTOMER, 403);

        return $request->user();
    }

    public function cart(Request $request)
    {
        return response()->json(['success' => true, 'data' => $this->checkout->cart($this->customer($request))]);
    }

    public function addCart(Request $request)
    {
        $user = $this->customer($request);
        $input = $request->validate(['listing_id' => 'required|integer|exists:farm_gamefowl_listings,id', 'quantity' => 'required|integer|min:1|max:100000']);
        $entry = $this->checkout->putCart($user, $input['listing_id'], $input['quantity']);

        return response()->json(['success' => true, 'data' => $entry], 201);
    }

    public function updateCart(Request $request, int $id)
    {
        $user = $this->customer($request);
        $entry = FarmCartItem::where('user_id', $user->id)->findOrFail($id);
        $input = $request->validate(['quantity' => 'required|integer|min:1|max:100000']);

        return response()->json(['success' => true, 'data' => $this->checkout->putCart($user, $entry->listing_id, $input['quantity'], false)]);
    }

    public function deleteCart(Request $request, int $id)
    {
        FarmCartItem::where('user_id', $this->customer($request)->id)->findOrFail($id)->delete();

        return response()->json(['success' => true]);
    }

    public function quote(Request $request)
    {
        $user = $this->customer($request);
        $input = $request->validate([
            'farm_id' => 'required|integer|exists:farms,id',
            'cart_item_ids' => 'required|array|min:1|max:100', 'cart_item_ids.*' => 'required|integer|distinct',
            'fulfillment_method' => 'required|in:pickup,delivery',
            'shipping_address_id' => 'required_if:fulfillment_method,delivery|nullable|integer',
            'order_instruction' => 'nullable|string|max:2000',
        ]);

        return response()->json(['success' => true, 'data' => $this->checkout->quote($user, $input)]);
    }

    public function store(Request $request)
    {
        $user = $this->customer($request);
        $input = $request->validate([
            'quote_token' => 'required|string|max:2000000',
            // Omission is allowed here only to support historical idempotency replays.
            'items' => 'sometimes|required|array|list|min:1|max:100',
            'items.*' => 'required|array:listing_id,birds',
            'items.*.listing_id' => 'required|integer|distinct',
            'items.*.birds' => 'required|array|list|min:1',
            'items.*.birds.*' => 'present|array:wingband_no,feather_color,feet_color',
            'items.*.birds.*.wingband_no' => 'nullable|string|max:100',
            'items.*.birds.*.feather_color' => 'nullable|string|max:100',
            'items.*.birds.*.feet_color' => 'nullable|string|max:100',
        ]);
        $key = $request->header('Idempotency-Key');
        abort_unless(is_string($key) && preg_match('/^[A-Za-z0-9._:-]{1,100}$/D', $key), 422, 'A valid Idempotency-Key header is required.');
        [$order, $created] = $this->checkout->create($user, $input['quote_token'], $key, $input['items'] ?? null);

        return response()->json(['success' => true, 'data' => $this->orders->summary($order)], $created ? 201 : 200);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $query = FarmOrder::query();
        if ($user->user_type === User::TYPE_CUSTOMER) {
            $query->where('customer_id', $user->id);
        } elseif ($user->user_type === User::TYPE_OWNER_MANAGER && $user->farm_id) {
            $query->where('farm_id', $user->farm_id)->whereNotNull('deposit_paid_at');
        } elseif ($user->user_type === User::TYPE_SHIPPING_PARTNER) {
            $query->where('shipping_partner_id', $user->id)->whereNotNull('deposit_paid_at');
        } else {
            abort_unless(in_array($user->user_type, [User::TYPE_ADMIN, User::TYPE_SUPER_ADMIN], true), 403);
        }
        $page = $query->latest('id')->paginate(20);
        $page->getCollection()->transform(fn ($order) => $this->orders->summary($order));

        return response()->json(['success' => true, 'data' => $page]);
    }

    public function partnerIndex(Request $request)
    {
        abort_unless($request->user()->user_type === User::TYPE_SHIPPING_PARTNER, 403);

        return $this->index($request);
    }

    public function show(Request $request, int $id)
    {
        $order = $this->orders->accessible($request->user(), $id);

        return response()->json(['success' => true, 'data' => $this->orders->summary($order)]);
    }

    public function paymentSession(Request $request, int $id)
    {
        $user = $this->customer($request);
        $order = $this->orders->accessible($user, $id);
        $input = $request->validate(['purpose' => 'required|in:deposit,balance']);
        $session = $this->payments->session($order, $input['purpose']);
        $status = match ($session['status']) {
            'creating', 'creation_unknown' => 202,
            'creation_failed' => 503,
            default => 200,
        };

        return response()->json(['success' => $status !== 503, 'data' => $session], $status);
    }

    public function cancel(Request $request, int $id)
    {
        $order = $this->orders->accessible($this->customer($request), $id);
        $cancelled = $this->payments->cancel($order);

        return response()->json([
            'success' => $cancelled,
            'message' => $cancelled ? 'Order cancelled.' : 'Payment is paid, processing, or cannot be verified. Inventory remains protected.',
            'data' => $this->orders->summary($order->refresh()),
        ], $cancelled ? 200 : 409);
    }

    public function confirm(Request $request, int $id)
    {
        $order = $this->orders->accessible($request->user(), $id);

        return response()->json(['success' => true, 'data' => $this->orders->summary($this->orders->confirm($order, $request->user()))]);
    }

    public function assignPartner(Request $request, int $id)
    {
        abort_unless(in_array($request->user()->user_type, [User::TYPE_ADMIN, User::TYPE_SUPER_ADMIN], true), 403);
        $input = $request->validate(['shipping_partner_id' => 'required|integer|exists:users,id']);
        $order = $this->orders->accessible($request->user(), $id);

        return response()->json(['success' => true, 'data' => $this->orders->summary($this->orders->assign($order, $request->user(), $input['shipping_partner_id']))]);
    }

    public function shippingConfirmation(Request $request, int $id)
    {
        $order = $this->orders->accessible($request->user(), $id);
        abort_unless($order->fulfillment_method === 'delivery', 422, 'This is not a delivery order.');
        $input = $request->validate(['per_box_fee' => 'required|numeric|min:0|max:99999999.99|decimal:0,2', 'pickup_date' => 'required|date_format:Y-m-d']);
        $order = $this->orders->schedule($order, $request->user(), $input['pickup_date'], FarmCheckoutService::cents($input['per_box_fee']));

        return response()->json(['success' => true, 'data' => $this->orders->summary($order)]);
    }

    public function pickupSchedule(Request $request, int $id)
    {
        $order = $this->orders->accessible($request->user(), $id);
        abort_unless($order->fulfillment_method === 'pickup', 422, 'This is not a direct pickup order.');
        $input = $request->validate(['pickup_date' => 'required|date_format:Y-m-d']);
        $order = $this->orders->schedule($order, $request->user(), $input['pickup_date'], 0);

        return response()->json(['success' => true, 'data' => $this->orders->summary($order)]);
    }

    public function resolveHold(Request $request, int $id)
    {
        abort_unless(in_array($request->user()->user_type, [User::TYPE_ADMIN, User::TYPE_SUPER_ADMIN], true), 403);
        $input = $request->validate(['pickup_date' => 'required|date_format:Y-m-d', 'reason' => 'required|string|min:3|max:2000']);
        $order = $this->orders->accessible($request->user(), $id);

        return response()->json(['success' => true, 'data' => $this->orders->summary(
            $this->orders->resolveHold($order, $request->user(), $input['pickup_date'], $input['reason']),
        )]);
    }
}
