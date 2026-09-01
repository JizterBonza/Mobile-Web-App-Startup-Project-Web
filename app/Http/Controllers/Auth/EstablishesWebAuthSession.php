<?php

namespace App\Http\Controllers\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

trait EstablishesWebAuthSession
{
    protected function establishWebAuthSession(Request $request, User $user, bool $remember = false)
    {
        $user->loadMissing('userCredential');

        if ($user->userCredential) {
            $user->userCredential->update([
                'last_login' => now(),
            ]);
        }

        Auth::login($user, $remember);

        $request->session()->regenerate();
        $request->session()->put('user_id', Auth::id());
        $request->session()->put('login_time', now());
        $request->session()->put('last_activity', now());
        $request->session()->put('session_timeout', now()->addHours(2));

        return redirect()->intended($user->getDashboardUrl());
    }
}
