<?php

namespace Tests\Unit;

use App\Http\Middleware\AuthenticatePayoutAutomation;
use Illuminate\Http\Request;
use Tests\TestCase;

class AuthenticatePayoutAutomationTest extends TestCase
{
    public function test_accepts_configured_api_key(): void
    {
        config(['payout.automation_api_key' => 'automation-secret']);

        $request = Request::create('/api/payouts/pending', 'GET');
        $request->headers->set('X-Api-Key', 'automation-secret');

        $response = (new AuthenticatePayoutAutomation())->handle(
            $request,
            fn () => response()->json(['ok' => true])
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($request->attributes->get('payout_automation'));
    }

    public function test_rejects_missing_or_invalid_credentials(): void
    {
        config(['payout.automation_api_key' => 'automation-secret']);

        $request = Request::create('/api/payouts/pending', 'GET');
        $response = (new AuthenticatePayoutAutomation())->handle(
            $request,
            fn () => response()->json(['ok' => true])
        );

        $this->assertSame(401, $response->getStatusCode());
    }
}
