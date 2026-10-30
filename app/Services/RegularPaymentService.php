<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RegularPaymentService
{
    public function __construct(private PaymongoService $provider, private PaymentSecurityService $security) {}

    public function session(Order $order, bool $intent = false): array
    {
        abort_if($order->isFarmOrder(), 409, 'Use the farm payment-session endpoint.');
        for ($retry = 0; $retry < 2; $retry++) {
            $payment = DB::transaction(function () use ($order, $intent) {
                $order = Order::lockForUpdate()->findOrFail($order->id);
                $detail = OrderDetail::lockForUpdate()->findOrFail($order->order_detail_id);
                $order->setRelation('orderDetail', $detail);
                abort_if($this->security->isCod($detail), 409, 'COD orders do not use online checkout.');
                abort_if($detail->payment_status === 'paid', 409, 'This order is already paid.');
                $uncertain = Payment::where('order_id', $order->id)->whereIn('status', ['creating', 'creation_unknown'])->latest('id')->lockForUpdate()->first();
                if ($uncertain) {
                    return $uncertain;
                }
                abort_if($this->security->held($order->id), 409, 'This order requires payment review.');
                $legs = $order->orderShops()->with('status')->get();
                abort_if($legs->isNotEmpty() && $legs->every(fn ($leg) => strtolower($leg->status?->stat_description ?? '') === 'cancelled'), 409, 'This order is cancelled.');
                if ($this->security->expected($order) === null) {
                    $this->security->review('order_snapshot_mismatch', $order->id);

                    return null; // Commit the review before returning a conflict.
                }
                app(VoucherService::class)->finalizeForCheckout($detail, (int) $order->user_id);
                $detail->refresh();
                $order->setRelation('orderDetail', $detail);
                $amount = $this->security->expected($order);
                if ($amount === null || $amount < 1) {
                    $this->security->review('order_snapshot_mismatch', $order->id);

                    return null;
                }
                $existing = Payment::where('order_id', $order->id)
                    ->whereNotIn('status', ['expired', 'creation_failed'])->latest('id')->lockForUpdate()->first();
                if ($existing && $existing->status !== 'awaiting_session') {
                    abort_if(($intent && $existing->checkout_session_id) || (! $intent && $existing->payment_intent_id && ! $existing->checkout_session_id), 409, 'Resume the existing payment method.');
                    if (FarmCheckoutService::cents($existing->amount) !== $amount) {
                        $existing->setAttribute('_close_before_replacement', true);
                    }

                    return $existing;
                }
                $payment = $existing ?? new Payment;
                $payment->fill([
                    'order_id' => $order->id, 'owner_user_id' => $order->user_id, 'purpose' => 'order',
                    'amount' => FarmCheckoutService::money($amount), 'currency' => 'PHP', 'provider' => 'paymongo',
                    'status' => 'creating', 'attempt_key' => $payment->attempt_key ?: (string) Str::uuid(),
                ])->save();
                $payment->setAttribute('_start_provider_request', true);

                return $payment;
            }, 3);
            abort_unless($payment, 409, 'Order totals require review.');
            if ($payment->getAttribute('_close_before_replacement')) {
                abort_unless($this->close($payment), 409, 'An existing payment is paid, processing, or unverified.');

                continue;
            }
            if ($payment->getAttribute('_start_provider_request')) {
                $response = $this->create($payment, $intent);
            }

            $result = $this->result($payment->fresh());
            if ($intent && isset($response)) {
                $result['provider_response'] = $response;
            }

            return $result;
        }
        abort(409, 'Payment changed. Retry after reconciliation.');
    }

    public function standalone(int $ownerId, int $amount, bool $intent): array
    {
        $payment = Payment::create([
            'order_id' => null, 'owner_user_id' => $ownerId, 'purpose' => $intent ? 'standalone_intent' : 'standalone_checkout',
            'amount' => FarmCheckoutService::money($amount), 'currency' => 'PHP', 'provider' => 'paymongo',
            'status' => 'creating', 'attempt_key' => (string) Str::uuid(),
        ]);

        return $this->create($payment, $intent);
    }

    private function create(Payment $payment, bool $intent = false): array
    {
        try {
            $options = ['metadata' => ['payment_attempt_key' => $payment->attempt_key]];
            if ($payment->order_id) {
                $options['reference_number'] = (string) $payment->order_id;
                $options['metadata']['order_id'] = (string) $payment->order_id;
            }
            $response = $intent
                ? $this->provider->createPaymentIntent((float) $payment->amount, ['gcash', 'card'], $options)
                : $this->provider->createCheckoutSession((float) $payment->amount, 'Order Payment', $options);
        } catch (\Throwable $e) {
            Payment::whereKey($payment->id)->where('status', 'creating')->update(['status' => 'creation_unknown']);
            if ($payment->fresh()->status !== 'paid') {
                $this->security->review('creation_unknown', $payment->order_id, $payment->id);
            }

            return [];
        }
        $id = $response['data']['id'] ?? null;
        $url = $response['data']['attributes']['checkout_url'] ?? null;
        $valid = is_string($id) && str_starts_with($id, $intent ? 'pi_' : 'cs_') && ($intent || is_string($url));
        $rejected = ! empty($response['errors']) && ($response['_creation_rejected'] ?? false);
        DB::transaction(function () use ($payment, $intent, $id, $url, $valid, $rejected) {
            if ($payment->order_id) {
                Order::whereKey($payment->order_id)->lockForUpdate()->firstOrFail();
            }
            $locked = Payment::lockForUpdate()->findOrFail($payment->id);
            // An early callback can already have safely recorded this attempt.
            $field = $intent ? 'payment_intent_id' : 'checkout_session_id';
            if ($valid && $locked->$field && $id !== $locked->$field) {
                $this->security->review('creation_resource_conflict', $locked->order_id, $locked->id);

                return;
            }
            if ($valid) {
                $locked->{$intent ? 'payment_intent_id' : 'checkout_session_id'} = $id;
                $locked->checkout_url = $url;
            }
            if ($locked->status !== 'paid') {
                $locked->status = $valid ? 'pending' : ($rejected ? 'creation_failed' : 'creation_unknown');
            }
            $locked->save();
        }, 3);
        if (! $valid && ! $rejected) {
            $this->security->review('creation_unknown', $payment->order_id, $payment->id);
        }
        unset($response['_creation_rejected']);

        return $response;
    }

    public function close(Payment $payment): bool
    {
        if (! $payment->checkout_session_id) {
            return false;
        }
        $status = app(PaymentStatusService::class)->syncPendingFromPaymongo($payment, true);
        if (in_array($status, [PaymentStatusService::RESULT_PAID, PaymentStatusService::RESULT_UNAVAILABLE], true)) {
            return false;
        }
        if ($payment->fresh()->status === 'expired') {
            return true;
        }
        try {
            $response = $this->provider->expireCheckoutSession($payment->checkout_session_id);
        } catch (\Throwable $e) {
            return false;
        }
        if (($response['data']['id'] ?? null) !== $payment->checkout_session_id
            || ($response['data']['attributes']['status'] ?? null) !== 'expired'
            || collect($response['data']['attributes']['payments'] ?? [])->contains(fn ($p) => ($p['attributes']['status'] ?? null) === 'paid')) {
            app(PaymentStatusService::class)->syncPendingFromPaymongo($payment, true);

            return false;
        }

        return DB::transaction(function () use ($payment) {
            Order::whereKey($payment->order_id)->lockForUpdate()->firstOrFail();
            $locked = Payment::lockForUpdate()->findOrFail($payment->id);
            if ($locked->status === 'paid') {
                return false;
            }
            $locked->update(['status' => 'expired']);

            return true;
        }, 3);
    }

    public function result(Payment $payment): array
    {
        return ['success' => $payment->status !== 'creation_failed', 'checkout_url' => $payment->checkout_url,
            'session_id' => $payment->checkout_session_id, 'total_amount' => $payment->amount,
            'payment_id' => $payment->id, 'status' => $payment->status];
    }
}
