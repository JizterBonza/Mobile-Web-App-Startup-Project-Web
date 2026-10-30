<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\EnsuresApiOwnership;
use App\Models\Order;
use App\Models\Payment;
use App\Services\FarmCheckoutService;
use App\Services\FarmOrderService;
use App\Services\FarmPaymentService;
use App\Services\PaymentStatusService;
use App\Services\PaymentWebhookService;
use App\Services\PaymongoService;
use App\Services\RegularPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    use EnsuresApiOwnership;

    public function __construct(private PaymongoService $paymongo, private PaymentStatusService $paymentStatuses) {}

    public function createIntent(Request $request)
    {
        $this->usage($request, 'intent');
        $input = $request->validate(['amount' => 'required_without:order_id|numeric|min:1|max:99999999.99|decimal:0,2', 'order_id' => 'nullable|integer']);
        if (! empty($input['order_id'])) {
            $order = $this->ownedOrder($request, $input['order_id']);
            $session = app(RegularPaymentService::class)->session($order, true);
            if (! empty($session['provider_response'])) {
                return response()->json($session['provider_response']);
            }
            $payment = Payment::findOrFail($session['payment_id']);
            if ($payment->payment_intent_id) {
                return response()->json($this->paymongo->retrievePaymentIntent($payment->payment_intent_id));
            }

            return response()->json($session, 202);
        }
        $response = app(RegularPaymentService::class)->standalone((int) $request->user()->id, FarmCheckoutService::cents($input['amount']), true);

        return response()->json($response, empty($response['data']) ? 202 : 200);
    }

    public function attachPayment(Request $request)
    {
        $this->usage($request, 'attach');
        $input = $request->validate([
            'payment_intent_id' => ['required', 'string', 'max:255', 'regex:/^pi_[A-Za-z0-9_]+$/D'],
            'payment_method_id' => ['required', 'string', 'max:255', 'regex:/^pm_[A-Za-z0-9_]+$/D'],
        ]);
        // Ownership is checked before any provider operation, including legacy IDs.
        $payment = Payment::where('owner_user_id', $request->user()->id)->where('payment_intent_id', $input['payment_intent_id'])->firstOrFail();
        DB::transaction(function () use ($payment, $request, $input) {
            $locked = Payment::lockForUpdate()->findOrFail($payment->id);
            abort_unless($locked->status === 'pending', 409, 'This payment cannot be attached.');
            DB::table('payment_method_bindings')->insertOrIgnore([
                'provider_method_id' => $input['payment_method_id'], 'owner_user_id' => $request->user()->id,
                'payment_id' => $locked->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
            $binding = DB::table('payment_method_bindings')->where('provider_method_id', $input['payment_method_id'])->lockForUpdate()->first();
            abort_unless((int) $binding->owner_user_id === (int) $request->user()->id && (int) $binding->payment_id === $locked->id, 403, 'Payment method belongs to another attempt.');
        }, 3);
        $response = $this->paymongo->attachPaymentIntent($input['payment_intent_id'], $input['payment_method_id'], config('app.url').'/api/payment-success');

        return response()->json($response);
    }

    public function paymentSuccess(Request $request)
    {
        return response()->json(['success' => true, 'message' => 'Return to your order in the app to check payment status.']);
    }

    public function paymentCancel(Request $request)
    {
        return response()->json(['success' => false, 'message' => 'Return to your order in the app to check payment status.']);
    }

    public function checkout(Request $request)
    {
        $this->usage($request, 'checkout');
        $input = $request->validate(['amount' => 'required_without:order_id|numeric|min:1|max:99999999.99|decimal:0,2', 'order_id' => 'nullable|integer']);
        if (! empty($input['order_id'])) {
            return $this->sessionResponse(app(RegularPaymentService::class)->session($this->ownedOrder($request, $input['order_id'])));
        }
        $response = app(RegularPaymentService::class)->standalone((int) $request->user()->id, FarmCheckoutService::cents($input['amount']), false);
        $id = $response['data']['id'] ?? null;
        $url = $response['data']['attributes']['checkout_url'] ?? null;

        return response()->json(['success' => (bool) ($id && $url), 'checkout_url' => $url, 'session_id' => $id,
            'message' => $id && $url ? 'Checkout created.' : 'Payment creation is pending verification.'], $id && $url ? 200 : 202);
    }

    public function handleWebhook(Request $request)
    {
        $raw = $request->getContent();
        if (! $this->verifyWebhookSignature($raw, $request->header('Paymongo-Signature'))) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }
        try {
            $payload = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
            if (! is_array($payload) || ($payload['data']['attributes']['livemode'] ?? null) !== (bool) config('services.paymongo.live_mode', true)) {
                return response()->json(['error' => 'Invalid payment mode'], 401);
            }
            $success = app(PaymentWebhookService::class)->accept($payload);
        } catch (\JsonException|\InvalidArgumentException $e) {
            return response()->json(['error' => 'Invalid event'], 422);
        }

        return response()->json(['received' => $success], $success ? 200 : 500);
    }

    private function verifyWebhookSignature(string $rawBody, ?string $header): bool
    {
        $secret = config('services.paymongo.webhook_secret');
        if (! $header || $rawBody === '' || ! $secret) {
            return false;
        }
        $parts = [];
        foreach (explode(',', $header) as $part) {
            $entry = explode('=', trim($part), 2);
            if (count($entry) !== 2 || isset($parts[$entry[0]])) {
                return false;
            }
            $parts[$entry[0]] = $entry[1];
        }
        $timestamp = $parts['t'] ?? '';
        if (! ctype_digit($timestamp) || abs(now()->timestamp - (int) $timestamp) > (int) config('services.paymongo.webhook_tolerance', 300)) {
            return false;
        }
        $signature = $parts[config('services.paymongo.live_mode', true) ? 'li' : 'te'] ?? '';

        return $signature !== '' && hash_equals(hash_hmac('sha256', $timestamp.'.'.$rawBody, $secret), $signature);
    }

    public function getCheckoutUrlByOrderId(Request $request, $orderId)
    {
        $this->usage($request, $request->isMethod('GET') ? 'legacy-checkout-url' : 'order-session');

        return $this->sessionResponse(app(RegularPaymentService::class)->session($this->ownedOrder($request, (int) $orderId)));
    }

    private function ownedOrder(Request $request, int $id): Order
    {
        $order = Order::with('orderDetail')->findOrFail($id);
        abort_unless((int) $order->user_id === (int) $request->user()->id || $this->isStaff($request->user()), 403);

        return $order;
    }

    private function sessionResponse(array $session)
    {
        unset($session['provider_response']);
        $status = match ($session['status']) {
            'creating', 'creation_unknown' => 202,
            'creation_failed' => 503,
            default => 200,
        };

        return response()->json($session, $status);
    }

    private function usage(Request $request, string $operation): void
    {
        Log::info('Payment endpoint used.', ['operation' => $operation, 'user_id' => $request->user()->id,
            'has_order_id' => $request->filled('order_id')]);
    }

    public function getPaymentStatusByOrderId(Request $request, $orderId)
    {
        $order = Order::with(['orderDetail', 'payment', 'orderShops'])->findOrFail($orderId);
        if ($order->isFarmOrder()) {
            $farm = app(FarmOrderService::class)->accessible($request->user(), (int) $orderId);
            app(FarmPaymentService::class)->reconcileOrder($farm);
            app(FarmOrderService::class)->check($farm);
            $data = app(FarmOrderService::class)->summary($farm->refresh());

            return response()->json(['success' => true, 'order_id' => $order->id, 'is_paid' => $data['payment_status'] === 'paid',
                'payment_status' => $data['payment_status'], 'amount_paid' => $data['amount_paid'], 'remaining_balance' => $data['remaining_balance'], 'data' => $data]);
        }
        if ($response = $this->forbidUnlessOrderAccess($request, $order)) {
            return $response;
        }
        $this->paymentStatuses->syncPendingFromPaymongo($order->payment);
        $order->load(['orderDetail', 'payment']);
        $status = $order->orderDetail?->payment_status ?? 'pending';

        return response()->json(['success' => true, 'order_id' => $order->id, 'is_paid' => $status === 'paid', 'payment_status' => $status,
            'payment' => $order->payment ? ['id' => $order->payment->id, 'status' => $order->payment->status,
                'payment_method' => $order->payment->payment_method, 'amount' => $order->payment->amount] : null]);
    }
}
