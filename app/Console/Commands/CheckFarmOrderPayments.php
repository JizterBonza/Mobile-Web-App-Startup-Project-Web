<?php

namespace App\Console\Commands;

use App\Models\FarmOrder;
use App\Services\FarmOrderService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckFarmOrderPayments extends Command
{
    protected $signature = 'farm-orders:check-payments';

    protected $description = 'Open farm balance windows and hold overdue orders.';

    public function handle(FarmOrderService $orders): int
    {
        $failed = false;
        FarmOrder::whereNull('cancelled_at')->whereNotNull('pickup_date')->whereNull('release_authorized_at')
            ->chunkById(100, function ($batch) use ($orders, &$failed) {
                foreach ($batch as $order) {
                    try {
                        // Deadline enforcement must not wait on provider network I/O.
                        // Signed webhooks and payment-status requests reconcile payments.
                        $orders->check($order);
                    } catch (\Throwable $e) {
                        $failed = true;
                        Log::error('Farm order scheduled check failed.', ['order_id' => $order->order_id, 'error' => $e->getMessage()]);
                    }
                }
            });

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
