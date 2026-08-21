<?php

namespace Tests\Unit;

use App\Services\OrderStatusCustomerMessageService;
use App\Services\ShopMessagingService;
use Tests\TestCase;

class OrderStatusCustomerMessageServiceTest extends TestCase
{
    private OrderStatusCustomerMessageService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new OrderStatusCustomerMessageService(
            $this->createMock(ShopMessagingService::class)
        );
    }

    public function test_builds_customer_messages_for_order_status_updates(): void
    {
        $this->assertSame(
            'Your order AGF-1001 has been accepted and is now being prepared.',
            $this->service->messageBody('Preparing', 'AGF-1001')
        );
        $this->assertSame(
            'Your order AGF-1001 is done preparing and ready for drop off.',
            $this->service->messageBody('Ready for Drop off', 'AGF-1001')
        );
        $this->assertSame(
            'Your order AGF-1001 is done preparing and ready for delivery.',
            $this->service->messageBody('Ready for Delivery', 'AGF-1001')
        );
        $this->assertSame(
            'Your order AGF-1001 is done preparing and ready for pickup.',
            $this->service->messageBody('Ready for Pickup', 'AGF-1001')
        );
        $this->assertSame(
            'Your order AGF-1001 is now in transit.',
            $this->service->messageBody('In-Transit', 'AGF-1001')
        );
        $this->assertSame(
            'Your order AGF-1001 has been delivered.',
            $this->service->messageBody('Delivered', 'AGF-1001')
        );
    }

    public function test_does_not_message_pending_or_cancelled_statuses(): void
    {
        $this->assertNull($this->service->messageBody('Pending', 'AGF-1001'));
        $this->assertNull($this->service->messageBody('Cancelled', 'AGF-1001'));
    }
}
