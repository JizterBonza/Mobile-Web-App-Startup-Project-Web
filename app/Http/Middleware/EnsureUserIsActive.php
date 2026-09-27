<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\AuthTokenService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function __construct(private AuthTokenService $authTokenService)
    {
    }

    /**
     * Sign out inactive or disabled accounts that still hold a session or token.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User || $user->isActive()) {
            return $next($request);
        }

        $token = $user->currentAccessToken();
        if ($token) {
            $this->authTokenService->revokeByAccessTokenId($token->id);
            $token->delete();
        }

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => User::INACTIVE_ACCOUNT_MESSAGE,
            ], 403);
        }

        return redirect()->route('login')->with('error', User::INACTIVE_ACCOUNT_MESSAGE);
    }
}
