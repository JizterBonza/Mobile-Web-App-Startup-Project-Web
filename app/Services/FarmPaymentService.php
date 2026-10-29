<?php

namespace App\Services;

use App\Models\FarmGamefowlListing;
use App\Models\FarmOrder;
use App\Models\Payment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class FarmPaymentService
{
    public function __construct(private readonly PaymongoService $provider) {}

    public function supports(Payment $payment): bool
    {
        return in_array($payment->purpose, ['farm_deposit', 'farm_balance'], true);
    }

    public function session(FarmOrder $order, string $purpose): array
    {
        $this->reconcileOrder($order);
        app(FarmOrderService::class)->check($order);
        $payment = DB::transaction(function () use ($order, $purpose) {
            $order = FarmOrder::lockForUpdate()->findOrFail($order->id);
            abort_if($order->cancelled_at || $order->held_at, 409, 'This order cannot receive a payment.');
            if ($purpose === 'deposit') {
                abort_if($order->deposit_paid_at, 409, 'The deposit is already paid.');
                $amount = $order->deposit_cents;
            } else {
                abort_unless(app(FarmOrderService::class)->balancePayable($order), 409, 'Balance payment is outside its payment window or is unavailable.');
                $amount = $order->total_cents - app(FarmOrderService::class)->paidCents($order);
            }
            $stage = 'farm_'.$purpose;
            $query = $order->payments()->where('purpose', $stage);
            if ($purpose === 'balance') {
                $query->where('schedule_version', $order->schedule_version);
            }
            $existing = $query->whereNotIn('status', ['expired', 'creation_failed'])->latest('id')->lockForUpdate()->first();
            if ($existing && $existing->status !== 'awaiting_session') {
                return $existing;
            }
            $payment = $existing ?? new Payment(['order_id' => $order->order_id, 'purpose' => $stage]);
            $payment->forceFill([
                'amount' => FarmCheckoutService::money($amount), 'currency' => 'PHP',
                'status' => 'creating', 'provider' => 'paymongo',
                'schedule_version' => $order->schedule_version, 'attempt_key' => (string) Str::uuid(),
                'metadata' => ['farm_order' => true, 'purpose' => $purpose],
            ])->save();
            $payment->setAttribute('_start_provider_request', true);

            return $payment;
        });

        if ($payment->getAttribute('_start_provider_request')) {
            try {
                $session = $this->provider->createCheckoutSession(
                    (float) $payment->amount,
                    'Farm order '.$order->order_id.' '.$purpose,
                    [
                        'reference_number' => (string) $order->order_id,
                        'metadata' => ['order_id' => (string) $order->order_id, 'payment_attempt_key' => $payment->attempt_key],
                        'success_url' => config('app.url').'/api/payment-success?order_id='.$order->order_id,
                        'cancel_url' => config('app.url').'/api/payment-cancel?order_id='.$order->order_id,
                    ],
                );
            } catch (\Throwable $e) {
                $payment->offsetUnset('_start_provider_request');
                Payment::whereKey($payment->id)->where('status', 'creating')->update(['status' => 'creation_unknown']);
                Log::error('Farm payment session outcome unknown; do not create a replacement.', ['payment_id' => $payment->id, 'error' => $e->getMessage()]);

                return $this->sessionResult($payment->fresh());
            }
            $payment->offsetUnset('_start_provider_request');
            $id = $session['data']['id'] ?? null;
            $url = $session['data']['attributes']['checkout_url'] ?? null;
            DB::transaction(function () use ($payment, $session, $id, $url, $order) {
                FarmOrder::whereKey($order->id)->lockForUpdate()->firstOrFail();
                $locked = Payment::lockForUpdate()->findOrFail($payment->id);
                // A webhook can arrive before the create-session response.
                $locked->update([
                    'checkout_session_id' => $id ?? $locked->checkout_session_id,
                    'checkout_url' => $url ?? $locked->checkout_url,
                    'status' => $locked->status === 'paid' ? 'paid'
                        : ($id && $url ? 'pending' : (! empty($session['errors']) ? 'creation_failed' : 'creation_unknown')),
                ]);
            });
        }

        return $this->sessionResult($payment->fresh());
    }

    private function sessionResult(Payment $payment): array
    {
        return [
            'payment_id' => $payment->id, 'purpose' => str_replace('farm_', '', $payment->purpose),
            'status' => $payment->status, 'amount' => $payment->amount, 'currency' => 'PHP',
            'checkout_url' => $payment->checkout_url, 'session_id' => $payment->checkout_session_id,
        ];
    }

    public function reconcileOrder(FarmOrder $order): void
    {
        foreach ($order->payments()->whereNotIn('status', ['paid', 'expired', 'creation_failed', 'awaiting_session'])->get() as $payment) {
            $this->reconcile($payment);
        }
    }

    public function reconcile(Payment $payment): string
    {
        $payment->refresh();
        if ($payment->status === 'paid') {
            return PaymentStatusService::RESULT_PAID;
        }
        if (! $payment->checkout_session_id) {
            return PaymentStatusService::RESULT_UNAVAILABLE;
        }
        try {
            $session = $this->provider->retrieveCheckoutSession($payment->checkout_session_id);
        } catch (\Throwable $e) {
            return PaymentStatusService::RESULT_UNAVAILABLE;
        }
        $data = $session['data'] ?? null;
        if (! $data || ($data['id'] ?? null) !== $payment->checkout_session_id) {
            return PaymentStatusService::RESULT_UNAVAILABLE;
        }
        $paid = collect($data['attributes']['payments'] ?? [])->first(fn ($candidate) => ($candidate['attributes']['status'] ?? null) === 'paid');
        if ($paid) {
            $this->markPaid($payment, $paid['id'], $paid['attributes']['source']['type'] ?? null, $data,
                $paid['attributes']['payment_intent_id'] ?? $data['attributes']['payment_intent']['id'] ?? null);

            return PaymentStatusService::RESULT_PAID;
        }
        if (($data['attributes']['status'] ?? null) === 'expired') {
            $this->recordClosed($payment);

            return PaymentStatusService::RESULT_FAILED;
        }

        return PaymentStatusService::RESULT_PENDING;
    }

    public function markPaid(Payment $payment, ?string $providerPaymentId, ?string $method, array $payload, ?string $intentId): bool
    {
        $attributes = $payload['attributes'] ?? [];
        $checkout = str_starts_with($payload['id'] ?? '', 'cs_');
        $resource = $checkout
            ? collect($attributes['payments'] ?? [])->first(fn ($entry) => ($entry['id'] ?? null) === $providerPaymentId && ($entry['attributes']['status'] ?? null) === 'paid')
            : $payload;
        $attrs = $resource['attributes'] ?? [];
        abort_unless($resource && ($attrs['status'] ?? null) === 'paid'
            && isset($attrs['amount']) && (int) $attrs['amount'] === FarmCheckoutService::cents($payment->amount)
            && ($attrs['currency'] ?? null) === 'PHP', 422, 'Provider payment amount or currency does not match the farm payment.');
        $attempt = $attributes['metadata']['payment_attempt_key'] ?? null;
        $linked = $checkout
            ? (($payment->checkout_session_id && $payment->checkout_session_id === ($payload['id'] ?? null))
                || (! $payment->checkout_session_id && $attempt && hash_equals($payment->attempt_key ?? '', $attempt)))
            : (($intentId && $intentId === $payment->payment_intent_id)
                || ($providerPaymentId && $providerPaymentId === $payment->payment_id)
                || ($attempt && hash_equals($payment->attempt_key ?? '', $attempt)));
        abort_unless($linked, 422, 'Payment is not linked to this checkout attempt.');

        return DB::transaction(function () use ($payment, $providerPaymentId, $method, $payload, $intentId, $checkout, $attrs, $attributes) {
            $order = FarmOrder::where('order_id', $payment->order_id)->lockForUpdate()->firstOrFail();
            $payment = Payment::lockForUpdate()->findOrFail($payment->id);
            if ($payment->status === 'paid') {
                return false;
            }
            $payment->update([
                'status' => 'paid', 'payment_id' => $providerPaymentId,
                'payment_intent_id' => $intentId ?? $payment->payment_intent_id,
                'payment_method' => $method ?? $payment->payment_method,
                'checkout_session_id' => $checkout ? $payload['id'] : $payment->checkout_session_id,
                'metadata' => array_merge($payment->metadata ?? [], ['provider_payload' => $payload]),
            ]);
            $workflow = app(FarmOrderService::class);
            if ($order->cancelled_at || $order->inventory_state === 'released') {
                $order->forceFill(['held_at' => now(), 'hold_reason' => 'payment_after_cancellation', 'status' => 'on_hold']);
            }
            if ($payment->purpose === 'farm_deposit' && ! $order->deposit_paid_at) {
                if ($order->inventory_state === 'reserved') {
                    foreach ($order->items()->orderBy('listing_id')->get() as $item) {
                        $listing = FarmGamefowlListing::lockForUpdate()->findOrFail($item->listing_id);
                        abort_unless($listing->stock >= $item->bird_count && $listing->reserved_stock >= $item->bird_count,
                            409, 'Reserved inventory is inconsistent.');
                        $listing->forceFill([
                            'stock' => $listing->stock - $item->bird_count,
                            'reserved_stock' => $listing->reserved_stock - $item->bird_count,
                        ])->save();
                    }
                    $order->inventory_state = 'allocated';
                }
                $order->deposit_paid_at = now();
                if (! $order->held_at) {
                    $order->status = 'awaiting_farm_confirmation';
                }
                foreach ($workflow->recipients($order, true) as $id) {
                    $workflow->notice($order, $id, 'deposit_paid', 'The 30% chicken deposit is verified. The farm can now confirm the order.');
                }
            }
            $paid = $workflow->paidCents($order);
            if ($order->total_cents !== null && $paid >= $order->total_cents && $order->deposit_paid_at) {
                $order->fully_paid_at ??= now();
            }
            $depositPaid = FarmCheckoutService::cents($order->payments()->where('purpose', 'farm_deposit')->where('status', 'paid')->sum('amount'));
            $paidAt = $attrs['paid_at'] ?? $attributes['paid_at'] ?? null;
            $paidAt = is_numeric($paidAt) ? Carbon::createFromTimestampUTC((int) $paidAt) : now();
            if (($payment->purpose === 'farm_balance' && $order->balance_due_at && $paidAt->gt($order->balance_due_at))
                || ($order->total_cents !== null && $paid > $order->total_cents) || $depositPaid > $order->deposit_cents) {
                $order->held_at ??= now();
                $order->hold_reason ??= ($depositPaid > $order->deposit_cents || ($order->total_cents !== null && $paid > $order->total_cents))
                    ? 'overpayment_review' : 'balance_deadline_missed';
                $order->status = 'on_hold';
            }
            $order->save();
            $order->order->orderDetail->update([
                'payment_status' => $order->fully_paid_at ? 'paid' : 'partially_paid',
                'payment_method' => $method ?? $payment->payment_method,
            ]);
            $workflow->event($order, 'payment_confirmed', null, ['purpose' => $payment->purpose, 'amount' => $payment->amount]);
            $workflow->notice($order, $order->customer_id, $payment->purpose.'_paid', 'Your '.str_replace('farm_', '', $payment->purpose).' payment has been confirmed.');
            $workflow->checkLocked($order);
            if ($order->held_at) {
                foreach ($workflow->recipients($order, true) as $id) {
                    $workflow->notice($order, $id, 'payment_hold', 'Payment requires admin review. Do not release this order.');
                }
            }

            return true;
        }, 3);
    }

    public function failed(Payment $payment, array $payload): void
    {
        // A failed attempt is not a terminal checkout session: keep the reservation.
        DB::transaction(function () use ($payment, $payload) {
            $order = FarmOrder::where('order_id', $payment->order_id)->lockForUpdate()->firstOrFail();
            $payment = Payment::lockForUpdate()->findOrFail($payment->id);
            if (! in_array($payment->status, ['paid', 'expired'], true)) {
                $payment->update(['metadata' => array_merge($payment->metadata ?? [], ['last_failed_attempt' => $payload])]);
                app(FarmOrderService::class)->notice($order, $order->customer_id, $payment->purpose.'_failed', 'Your payment attempt failed. You can retry the existing payment checkout.');
            }
        });
    }

    /** Requires the farm-order lock. Returns false when paid/processing/unknown. */
    public function closeSessions(FarmOrder $order, ?string $purpose = null): bool
    {
        $query = $order->payments()->whereNotIn('status', ['paid', 'expired', 'creation_failed']);
        if ($purpose) {
            $query->where('purpose', $purpose);
        }
        foreach ($query->orderBy('id')->get() as $payment) {
            if ($payment->status === 'awaiting_session') {
                $payment->update(['status' => 'expired']);

                continue;
            }
            if (! $payment->checkout_session_id) {
                return false;
            }
            $result = $this->reconcile($payment);
            if ($result === PaymentStatusService::RESULT_PAID) {
                return false;
            }
            if ($result === PaymentStatusService::RESULT_UNAVAILABLE) {
                return false;
            }
            if ($payment->fresh()->status === 'expired') {
                continue;
            }
            try {
                $expired = $this->provider->expireCheckoutSession($payment->checkout_session_id);
            } catch (\Throwable $e) {
                return false;
            }
            if (($expired['data']['id'] ?? null) !== $payment->checkout_session_id
                || ($expired['data']['attributes']['status'] ?? null) !== 'expired') {
                $this->reconcile($payment);

                return false;
            }
            $payment->update(['status' => 'expired']);
        }

        return true;
    }

    public function cancel(FarmOrder $order): bool
    {
        $this->reconcileOrder($order);

        return DB::transaction(function () use ($order) {
            $order = FarmOrder::lockForUpdate()->findOrFail($order->id);
            abort_if($order->deposit_paid_at, 409, 'Paid deposits require admin cancellation review.');
            if ($order->cancelled_at) {
                return true;
            }
            if (! $this->closeSessions($order)) {
                return false;
            }
            $this->releaseReservation($order);

            return true;
        });
    }

    private function recordClosed(Payment $payment): void
    {
        DB::transaction(function () use ($payment) {
            $order = FarmOrder::where('order_id', $payment->order_id)->lockForUpdate()->firstOrFail();
            $payment = Payment::lockForUpdate()->findOrFail($payment->id);
            if ($payment->status !== 'paid') {
                $payment->update(['status' => 'expired']);
            }
            if (! $order->deposit_paid_at && ! $order->payments()->whereNotIn('status', ['expired', 'creation_failed'])->exists()) {
                $this->releaseReservation($order);
            }
        });
    }

    private function releaseReservation(FarmOrder $order): void
    {
        $order->refresh();
        if ($order->inventory_state !== 'reserved') {
            return;
        }
        foreach ($order->items()->orderBy('listing_id')->get() as $item) {
            $listing = FarmGamefowlListing::lockForUpdate()->findOrFail($item->listing_id);
            abort_if($listing->reserved_stock < $item->bird_count, 409, 'Reserved inventory is inconsistent.');
            $listing->forceFill(['reserved_stock' => $listing->reserved_stock - $item->bird_count])->save();
        }
        $order->update(['inventory_state' => 'released', 'cancelled_at' => now(), 'status' => 'cancelled']);
        $order->order->orderDetail->update(['payment_status' => 'cancelled']);
        app(FarmOrderService::class)->event($order, 'order_cancelled');
    }
}
