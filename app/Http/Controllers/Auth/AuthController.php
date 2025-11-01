<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Session;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AuthController extends Controller
{
    /**
     * Check if the current session is valid and not expired.
     */
    private function isSessionValid(Request $request)
    {
        if (!Auth::check()) {
            return false;
        }

        // Check if session timeout has passed
        $sessionTimeout = $request->session()->get('session_timeout');
        if ($sessionTimeout && now()->gt($sessionTimeout)) {
            return false;
        }

        // Check if last activity was more than 2 hours ago
        $lastActivity = $request->session()->get('last_activity');
        if ($lastActivity && now()->diffInHours($lastActivity) > 2) {
            return false;
        }

        return true;
    }

    /**
     * Update last activity timestamp in session.
     */
    private function updateLastActivity(Request $request)
    {
        $request->session()->put('last_activity', now());
    }
    /**
     * Show the login form.
     */
    public function showLogin()
    {
        return Inertia::render('Auth/Login');
    }

    /**
     * Handle a login request.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        if (Auth::attempt($request->only('email', 'password'), $request->boolean('remember'))) {
            // Regenerate session ID for security
            $request->session()->regenerate();
            
            // Store additional session data
            $request->session()->put('user_id', Auth::id());
            $request->session()->put('login_time', now());
            $request->session()->put('last_activity', now());
            
            // Set session timeout (2 hours)
            $request->session()->put('session_timeout', now()->addHours(2));

            return redirect()->intended('/dashboard');
        }

        throw ValidationException::withMessages([
            'email' => 'The provided credentials do not match our records.',
        ]);
    }

    /**
     * Show the registration form.
     */
    public function showRegister()
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle a registration request.
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // Login the user after registration
        Auth::login($user);
        
        // Regenerate session ID for security
        $request->session()->regenerate();
        
        // Store additional session data
        $request->session()->put('user_id', $user->id);
        $request->session()->put('login_time', now());
        $request->session()->put('last_activity', now());
        
        // Set session timeout (2 hours)
        $request->session()->put('session_timeout', now()->addHours(2));

        return redirect('/dashboard');
    }

    /**
     * Handle a logout request.
     */
    public function logout(Request $request)
    {
        // Clear all session data
        $request->session()->flush();
        
        // Logout the user
        Auth::logout();
        
        // Invalidate the session completely
        $request->session()->invalidate();
        
        // Regenerate CSRF token
        $request->session()->regenerateToken();
        
        // Clear the session cookie
        $request->session()->forget('user_id');
        $request->session()->forget('login_time');
        $request->session()->forget('last_activity');
        $request->session()->forget('session_timeout');

        return redirect('/');
    }

    /**
     * Check session status and handle expired sessions.
     */
    public function checkSession(Request $request)
    {
        if (!$this->isSessionValid($request)) {
            // Session is invalid, logout user
            $this->logout($request);
            return response()->json([
                'valid' => false,
                'message' => 'Session expired. Please login again.'
            ], 401);
        }

        // Update last activity
        $this->updateLastActivity($request);

        return response()->json([
            'valid' => true,
            'user' => Auth::user(),
            'session_data' => [
                'login_time' => $request->session()->get('login_time'),
                'last_activity' => $request->session()->get('last_activity'),
                'session_timeout' => $request->session()->get('session_timeout'),
            ]
        ]);
    }
}
