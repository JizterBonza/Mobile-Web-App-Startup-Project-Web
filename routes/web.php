<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

// Authentication Routes
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
Route::post('/register', [AuthController::class, 'register']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
Route::get('/session/check', [AuthController::class, 'checkSession'])->middleware('auth');

// Protected Routes - User Type Specific Dashboards
Route::get('/dashboard/super-admin', function () {
    return Inertia::render('Dashboard/SuperAdminDashboard');
})->middleware(['auth', 'session.valid', 'user.type:super_admin'])->name('dashboard.super-admin');

// User Management Routes
Route::middleware(['auth', 'session.valid', 'user.type:super_admin'])->prefix('dashboard/super-admin/users')->name('dashboard.super-admin.users.')->group(function () {
    Route::get('/', [UserController::class, 'index'])->name('index');
    Route::post('/', [UserController::class, 'store'])->name('store');
    Route::put('/{id}', [UserController::class, 'update'])->name('update');
    Route::delete('/{id}', [UserController::class, 'deactivate'])->name('deactivate');
});

Route::get('/dashboard/admin', function () {
    return Inertia::render('Dashboard/AdminDashboard');
})->middleware(['auth', 'session.valid', 'user.type:admin'])->name('dashboard.admin');

Route::get('/dashboard/vendor', function () {
    return Inertia::render('Dashboard/VendorDashboard');
})->middleware(['auth', 'session.valid', 'user.type:vendor'])->name('dashboard.vendor');

Route::get('/dashboard/veterinarian', function () {
    return Inertia::render('Dashboard/VeterinarianDashboard');
})->middleware(['auth', 'session.valid', 'user.type:veterinarian'])->name('dashboard.veterinarian');

// Legacy dashboard route - redirect to user's specific dashboard
Route::get('/dashboard', function () {
    $user = auth()->user();
    return redirect($user->getDashboardUrl());
})->middleware(['auth', 'session.valid']);
