<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticatePayoutAutomation
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($this->hasValidApiKey($request)) {
            $request->attributes->set('payout_automation', true);

            return $next($request);
        }

        $user = Auth::guard('sanctum')->user();
        if ($user) {
            Auth::setUser($user);
            $request->setUserResolver(static fn () => $user);

            return $next($request);
        }

        return response()->json([
            'success' => false,
            'message' => 'Unauthorized. Provide X-Api-Key or a Sanctum bearer token.',
        ], 401);
    }

    private function hasValidApiKey(Request $request): bool
    {
        $expected = (string) config('payout.automation_api_key', '');
        if ($expected === '') {
            return false;
        }

        $provided = $request->header('X-Api-Key')
            ?? $request->header('X-Payout-Api-Key')
            ?? $request->bearerToken();

        if (! is_string($provided) || $provided === '') {
            return false;
        }

        return hash_equals($expected, $provided);
    }
}
