<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckSessionValidity
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only check session validity for authenticated users
        if (Auth::check()) {
            // Check if session timeout has passed
            $sessionTimeout = $request->session()->get('session_timeout');
            if ($sessionTimeout && now()->gt($sessionTimeout)) {
                $this->clearSession($request);
                return redirect('/login')->with('message', 'Your session has expired. Please login again.');
            }

            // Check if last activity was more than 2 hours ago
            $lastActivity = $request->session()->get('last_activity');
            if ($lastActivity && now()->diffInHours($lastActivity) > 2) {
                $this->clearSession($request);
                return redirect('/login')->with('message', 'Your session has expired due to inactivity. Please login again.');
            }

            // Update last activity timestamp
            $request->session()->put('last_activity', now());
        }

        return $next($request);
    }

    /**
     * Clear session data and logout user.
     */
    private function clearSession(Request $request)
    {
        $request->session()->flush();
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
