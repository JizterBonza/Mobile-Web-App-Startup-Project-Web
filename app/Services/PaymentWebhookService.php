<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Support\Facades\DB;

class PaymentWebhookService
{
    public function process(array $payload): void
    {
        $event = $payload['data']['attributes']['type'] ?? '';
        $data = $payload['data']['attributes']['data'] ?? null;
        if (! is_array($data)) {
            throw new \InvalidArgumentException('Webhook resource is missing.');
        }
        if (! in_array($event, ['checkout_session.payment.paid', 'checkout_session.payment.failed', 'payment.paid', 'payment.failed'], true)) {
            return;
        }
        $payment = $this->resolve($data);
        $checkout = str_starts_with($event, 'checkout_session.');
        if (str_ends_with($event, '.failed')) {
            if ($payment) {
                app(PaymentStatusService::class)->markFailed($payment, $data);
            }

            return;
        }
        $resources = $checkout ? ($data['attributes']['payments'] ?? []) : [$data];
        foreach ($resources as $resource) {
            if (($resource['attributes']['status'] ?? null) !== 'paid') {
                continue;
            }
            if (! $payment) {
                app(PaymentSecurityService::class)->receipt(null, $resource, false, null);

                continue;
            }
            app(PaymentStatusService::class)->markPaid($payment, $resource['id'] ?? null,
                $resource['attributes']['source']['type'] ?? $resource['attributes']['payment_method_used'] ?? null,
                $checkout ? $data : $resource,
                $resource['attributes']['payment_intent_id'] ?? $data['attributes']['payment_intent']['id'] ?? null);
        }
        if ($resources === []) {
            app(PaymentSecurityService::class)->review('missing_provider_receipt', $payment?->order_id, $payment?->id);
        }
    }

    public function resolve(array $data): ?Payment
    {
        $id = $data['id'] ?? null;
        if (is_string($id) && str_starts_with($id, 'cs_')) {
            $payment = Payment::where('checkout_session_id', $id)->first()
                ?? Payment::whereJsonContains('metadata->previous_checkout_session_ids', $id)->latest('id')->first();
            if ($payment) {
                return $payment;
            }
        }
        if (is_string($id) && str_starts_with($id, 'pay_')) {
            $payment = Payment::where('payment_id', $id)->first();
            if ($payment) {
                return $payment;
            }
            $intent = $data['attributes']['payment_intent_id'] ?? null;
            if (is_string($intent) && ($payment = Payment::where('payment_intent_id', $intent)->first())) {
                return $payment;
            }
        }
        $key = $data['attributes']['metadata']['payment_attempt_key'] ?? null;

        // An order ID/reference number alone is never sufficient to associate money.
        return is_string($key) ? Payment::where('attempt_key', $key)->first() : null;
    }

    public function accept(array $payload): bool
    {
        $body = json_encode($payload, JSON_THROW_ON_ERROR);
        $eventId = $payload['data']['id'] ?? 'legacy:'.hash('sha256', $body);
        if (! is_string($eventId) || strlen($eventId) > 255) {
            throw new \InvalidArgumentException('Invalid event ID.');
        }
        DB::table('payment_webhook_events')->insertOrIgnore([
            'event_id' => $eventId, 'body_hash' => hash('sha256', $body), 'payload' => $body,
            'status' => 'pending', 'attempts' => 0, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return $this->retry($eventId, hash('sha256', $body));
    }

    public function retry(string $eventId, ?string $bodyHash = null): bool
    {
        try {
            return DB::transaction(function () use ($eventId, $bodyHash) {
                $event = DB::table('payment_webhook_events')->where('event_id', $eventId)->lockForUpdate()->first();
                if (! $event || ($bodyHash && ! hash_equals($event->body_hash, $bodyHash))) {
                    throw new \InvalidArgumentException('Event ID was reused with different content.');
                }
                if ($event->status === 'processed') {
                    return true;
                }
                $this->process(json_decode($event->payload, true, 512, JSON_THROW_ON_ERROR));
                DB::table('payment_webhook_events')->where('id', $event->id)->update([
                    'status' => 'processed', 'attempts' => $event->attempts + 1, 'last_error' => null, 'updated_at' => now(),
                ]);

                return true;
            }, 3);
        } catch (\Throwable $e) {
            DB::table('payment_webhook_events')->where('event_id', $eventId)->where('status', '!=', 'processed')->update([
                'status' => 'failed', 'attempts' => DB::raw('attempts + 1'), 'last_error' => substr($e->getMessage(), 0, 2000), 'updated_at' => now(),
            ]);

            return false;
        }
    }
}
