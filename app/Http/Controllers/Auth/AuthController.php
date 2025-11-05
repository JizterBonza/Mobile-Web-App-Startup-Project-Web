<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserDetail;
use App\Models\UserCredential;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
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

        // Find UserDetail by email
        $userDetail = UserDetail::where('email', $request->email)->first();

        if (!$userDetail) {
            throw ValidationException::withMessages([
                'email' => 'The provided credentials do not match our records.',
            ]);
        }

        // Find User through UserDetail
        $user = User::where('user_detail_id', $userDetail->id)->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => 'The provided credentials do not match our records.',
            ]);
        }

        // Load UserCredential to check password
        $user->load('userCredential');

        if (!$user->userCredential || !Hash::check($request->password, $user->userCredential->password_hash)) {
            throw ValidationException::withMessages([
                'email' => 'The provided credentials do not match our records.',
            ]);
        }

        // Update last login timestamp
        $user->userCredential->update([
            'last_login' => now(),
        ]);

        // Check if user has a valid user_type
        if (!$user->user_type) {
            throw ValidationException::withMessages([
                'email' => 'Your account is not properly configured. Please contact support.',
            ]);
        }

        // Login the user
        Auth::login($user, $request->boolean('remember'));
        
        // Regenerate session ID for security
        $request->session()->regenerate();
        
        // Store additional session data
        $request->session()->put('user_id', Auth::id());
        $request->session()->put('login_time', now());
        $request->session()->put('last_activity', now());
        
        // Set session timeout (2 hours)
        $request->session()->put('session_timeout', now()->addHours(2));

        // Redirect to user-type specific dashboard
        return redirect()->intended($user->getDashboardUrl());
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
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|string|email|max:255|unique:user_details,email',
            'password' => 'required|string|min:6|confirmed',
            'username' => 'nullable|string|max:100|unique:user_credentials,username',
        ]);

        try {
            DB::beginTransaction();

            // Generate username from email if not provided
            $username = $request->username ?? explode('@', $request->email)[0] . '_' . time();

            // Create UserDetail
            $userDetail = UserDetail::create([
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name ?? null,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'mobile_number' => $request->mobile_number ?? null,
            ]);

            // Create UserCredential
            $userCredential = UserCredential::create([
                'username' => $username,
                'password_hash' => Hash::make($request->password),
            ]);

            // Create User
            $user = User::create([
                'user_detail_id' => $userDetail->id,
                'user_credential_id' => $userCredential->id,
                'status' => 'active',
                'user_type' => $request->user_type ?? User::TYPE_VENDOR, // Default to vendor if not specified
            ]);

            DB::commit();

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

            // Redirect to user-type specific dashboard
            return redirect($user->getDashboardUrl());
        } catch (\Exception $e) {
            DB::rollBack();
            throw ValidationException::withMessages([
                'email' => 'Registration failed. Please try again.',
            ]);
        }
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
