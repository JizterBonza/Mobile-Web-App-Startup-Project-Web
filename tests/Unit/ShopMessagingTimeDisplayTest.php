<?php

namespace Tests\Unit;

use App\Services\ShopMessagingService;
use Carbon\Carbon;
use ReflectionMethod;
use Tests\TestCase;

class ShopMessagingTimeDisplayTest extends TestCase
{
    private ShopMessagingService $service;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('app.timezone', 'UTC');
        config()->set('app.display_timezone', 'Asia/Manila');

        $this->service = new ShopMessagingService();
        Carbon::setTestNow(Carbon::parse('2026-09-08 05:10:00', 'UTC'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_message_clock_uses_manila_instead_of_utc(): void
    {
        $utc = Carbon::parse('2026-09-08 05:10:00', 'UTC');

        $this->assertSame('1.10 PM', $this->invoke('formatClockTime', $utc));
        $this->assertSame('1:10 PM', $this->invoke('listTimestamp', $utc));
    }

    public function test_date_separator_uses_manila_calendar_day(): void
    {
        $justBeforeManilaMidnight = Carbon::parse('2026-09-08 15:59:00', 'UTC');
        $justAfterManilaMidnight = Carbon::parse('2026-09-08 16:00:00', 'UTC');

        $this->assertSame('Today', $this->invoke('dateSeparatorLabel', $justBeforeManilaMidnight));

        Carbon::setTestNow(Carbon::parse('2026-09-08 16:05:00', 'UTC'));

        $this->assertSame('Today', $this->invoke('dateSeparatorLabel', $justAfterManilaMidnight));
        $this->assertSame('Yesterday', $this->invoke('dateSeparatorLabel', $justBeforeManilaMidnight));
    }

    private function invoke(string $method, mixed $argument): mixed
    {
        $reflected = new ReflectionMethod(ShopMessagingService::class, $method);
        $reflected->setAccessible(true);

        return $reflected->invoke($this->service, $argument);
    }
}
