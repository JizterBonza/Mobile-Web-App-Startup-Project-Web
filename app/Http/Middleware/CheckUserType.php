<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckUserType
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $userType
     */
    public function handle(Request $request, Closure $next, string $userType): Response
    {
        // Check if user is authenticated
        if (!Auth::check()) {
            return redirect('/login');
        }

        $user = Auth::user();

        $allowedTypes = str_contains($userType, '|')
            ? array_map('trim', explode('|', $userType))
            : [$userType];

        // Check if user has one of the allowed user types
        if (!$user->user_type || ! in_array($user->user_type, $allowedTypes, true)) {
            // Redirect to user's own dashboard if they try to access another type's dashboard
            return redirect($user->getDashboardUrl())->with('error', 'You do not have permission to access that page.');
        }

        return $next($request);
    }
}
