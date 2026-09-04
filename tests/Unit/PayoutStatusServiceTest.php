<?php

namespace Tests\Unit;

use App\Models\Payout;
use App\Services\PayoutStatusService;
use App\Services\ShopWalletService;
use InvalidArgumentException;
use Tests\TestCase;

class PayoutStatusServiceTest extends TestCase
{
    private PayoutStatusService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PayoutStatusService(new ShopWalletService());
    }

    public function test_normalizes_success_and_failed_aliases(): void
    {
        $this->assertSame(Payout::STATUS_SUCCESS, $this->service->normalizeStatus('success'));
        $this->assertSame(Payout::STATUS_SUCCESS, $this->service->normalizeStatus('Completed'));
        $this->assertSame(Payout::STATUS_FAILED, $this->service->normalizeStatus('failed'));
        $this->assertSame(Payout::STATUS_FAILED, $this->service->normalizeStatus('FAILURE'));
    }

    public function test_rejects_unknown_status(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->service->normalizeStatus('pending');
    }

    public function test_allows_pending_to_success_or_failed(): void
    {
        $payout = new Payout(['status' => Payout::STATUS_PENDING]);

        $this->service->assertCanTransition($payout, Payout::STATUS_SUCCESS);
        $this->service->assertCanTransition($payout, Payout::STATUS_FAILED);
        $this->assertTrue(true);
    }

    public function test_same_status_is_a_noop(): void
    {
        $payout = new Payout(['status' => Payout::STATUS_SUCCESS]);

        $this->service->assertCanTransition($payout, Payout::STATUS_SUCCESS);
        $this->assertTrue(true);
    }

    public function test_rejects_changing_a_terminal_status(): void
    {
        $payout = new Payout(['status' => Payout::STATUS_SUCCESS]);

        $this->expectException(InvalidArgumentException::class);
        $this->service->assertCanTransition($payout, Payout::STATUS_FAILED);
    }
}
