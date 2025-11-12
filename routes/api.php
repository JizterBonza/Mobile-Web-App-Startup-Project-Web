<?php

use App\Http\Controllers\Api\SocialAuthController;
use App\Http\Controllers\MobileAuthController;
use Illuminate\Http\Request;

Route::post('register', [MobileAuthController::class, 'register']);
Route::post('login', [MobileAuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [MobileAuthController::class, 'logout']);
    Route::get('profile', function (Request $request) {
        return response()->json($request->user());
    });
    // add other protected routes here
});

Route::prefix('auth')->group(function () {
    Route::get('{provider}/redirect', [SocialAuthController::class, 'redirect']);
    Route::get('{provider}/callback', [SocialAuthController::class, 'callback']);
});

