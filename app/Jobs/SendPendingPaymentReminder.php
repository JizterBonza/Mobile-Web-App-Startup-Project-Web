<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Payment;
use App\Services\PaymentStatusService;
use App\Support\PaymentMethodType;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class SendPendingPaymentReminder implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $uniqueFor = 3600;

    public function __construct(public readonly int $orderId) {}

    public function uniqueId(): string
    {
        return (string) $this->orderId;
    }

    /**
     * @return list<int>
     */
    public function backoff(): array
    {
        return [60, 300];
    }

    public function handle(PaymentStatusService $paymentStatuses): void
    {
        $order = $this->pendingOnlineOrder();
        if (! $order) {
            return;
        }

        $result = $paymentStatuses->syncPendingFromPaymongo($order->payment);
        if ($result === PaymentStatusService::RESULT_UNAVAILABLE) {
            throw new RuntimeException("Unable to verify PayMongo payment for order {$this->orderId}.");
        }

        if ($result !== PaymentStatusService::RESULT_PENDING) {
            return;
        }

        $this->createReminderIfStillPending();
    }

    public function failed(?Throwable $exception): void
    {
        Log::warning('Pending payment reminder abandoned after PayMongo verification failures.', [
            'order_id' => $this->orderId,
            'error' => $exception?->getMessage(),
        ]);
    }

    private function pendingOnlineOrder(): ?Order
    {
        $order = Order::query()
            ->with(['orderDetail', 'payment', 'orderShops.status'])
            ->find($this->orderId);

        if (! $order?->orderDetail
            || PaymentMethodType::isCod($order->orderDetail->payment_method)
            || $order->orderDetail->payment_status !== 'pending'
            || ! $order->payment
            || $order->payment->status !== 'pending'
            || $this->isFullyCancelled($order)
        ) {
            return null;
        }

        return $order;
    }

    private function createReminderIfStillPending(): void
    {
        DB::transaction(function () {
            $payment = Payment::query()
                ->where('order_id', $this->orderId)
                ->latest('id')
                ->lockForUpdate()
                ->first();
            $order = Order::query()->find($this->orderId);
            $orderDetail = $order
                ? OrderDetail::query()->lockForUpdate()->find($order->order_detail_id)
                : null;

            if (! $order
                || ! $orderDetail
                || ! $payment
                || PaymentMethodType::isCod($orderDetail->payment_method)
                || $orderDetail->payment_status !== 'pending'
                || $payment->status !== 'pending'
            ) {
                return;
            }

            $order->setRelation('orderDetail', $orderDetail);
            $order->load('orderShops.status');
            if ($this->isFullyCancelled($order)) {
                return;
            }

            Notification::query()->firstOrCreate(
                [
                    'user_id' => $order->user_id,
                    'type' => 'payment_reminder',
                    'reference_type' => Order::class,
                    'reference_id' => $order->id,
                ],
                [
                    'category' => Notification::CATEGORY_PAYMENT,
                    'title' => 'Payment Reminder',
                    'message' => "Your order {$orderDetail->order_code} is still awaiting payment. Please complete your payment to proceed.",
                    'data' => [
                        'order_id' => $order->id,
                        'order_code' => $orderDetail->order_code,
                        'total_amount' => $orderDetail->total_amount,
                        'payment_status' => 'pending',
                    ],
                    'action_url' => "/orders/{$order->id}",
                ],
            );
        });
    }

    private function isFullyCancelled(Order $order): bool
    {
        return $order->orderShops->isNotEmpty()
            && $order->orderShops->every(
                fn ($orderShop) => strtolower(trim((string) $orderShop->status?->stat_description)) === 'cancelled'
            );
    }
}
