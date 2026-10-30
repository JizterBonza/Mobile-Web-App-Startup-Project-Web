<?php

namespace App\Console\Commands;

use App\Models\FarmOrder;
use App\Models\Payment;
use App\Services\FarmPaymentService;
use App\Services\PaymentSecurityService;
use App\Services\PaymentStatusService;
use App\Services\PaymentWebhookService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReconcilePayments extends Command
{
    protected $signature = 'payments:reconcile';

    protected $description = 'Reconcile provider receipts, retry verified events, and expire unpaid farm reservations.';

    public function handle(PaymentStatusService $statuses, FarmPaymentService $farms): int
    {
        $failed = false;
        DB::table('payment_webhook_events')->whereIn('status', ['pending', 'failed'])->orderBy('id')->limit(100)->get()
            ->each(function ($event) use (&$failed) {
                if (! app(PaymentWebhookService::class)->retry($event->event_id)) {
                    $failed = true;
                }
            });
        Payment::whereNotIn('status', ['expired', 'creation_failed', 'awaiting_session', 'refunded', 'partially_refunded'])
            ->where(function ($query) {
                $query->where('status', '!=', 'paid')->orWhere('updated_at', '>=', now()->subDay())
                    ->orWhereNotExists(fn ($q) => $q->selectRaw('1')->from('payment_receipts')->whereColumn('payment_receipts.payment_id', 'payments.id'));
            })->chunkById(100, function ($payments) use ($statuses, &$failed) {
                foreach ($payments as $payment) {
                    try {
                        if (! $payment->checkout_session_id && ! $payment->payment_intent_id) {
                            if ($payment->status === 'creating' && $payment->created_at->gt(now()->subMinutes(2))) {
                                continue;
                            }
                            Payment::whereKey($payment->id)->where('status', 'creating')->update(['status' => 'creation_unknown']);
                            app(PaymentSecurityService::class)->review('creation_unknown', $payment->order_id, $payment->id);

                            continue;
                        }
                        if ($statuses->syncPendingFromPaymongo($payment, true) === PaymentStatusService::RESULT_UNAVAILABLE) {
                            $failed = true;
                        }
                    } catch (\Throwable $e) {
                        $failed = true;
                        Log::error('Scheduled payment reconciliation failed.', ['payment_id' => $payment->id, 'error' => $e->getMessage()]);
                    }
                }
            });
        FarmOrder::whereNull('cancelled_at')->whereNull('deposit_paid_at')->whereNotNull('reservation_expires_at')
            ->where('reservation_expires_at', '<=', now()->addHour())->chunkById(100, function ($orders) use ($farms, &$failed) {
                foreach ($orders as $order) {
                    try {
                        $farms->expireReservation($order);
                    } catch (\Throwable $e) {
                        $failed = true;
                        Log::error('Reservation expiry failed.', ['order_id' => $order->order_id, 'error' => $e->getMessage()]);
                    }
                }
            });
        $counts = DB::table('payment_reviews')->whereNull('resolved_at')->selectRaw('reason, count(*) as total')->groupBy('reason')->pluck('total', 'reason')->all();
        Log::info('Payment security reconciliation completed.', ['open_reviews' => $counts, 'unavailable' => $failed]);
        $this->line(json_encode(['open_reviews' => $counts, 'unavailable' => $failed]));

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
