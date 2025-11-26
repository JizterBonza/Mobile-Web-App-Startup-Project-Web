<?php

use App\Http\Controllers\Api\SocialAuthController;
use App\Http\Controllers\MobileAuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\OrderController;
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

// Category routes
Route::get('categories', [CategoryController::class, 'index']);
Route::get('categories/{id}', [CategoryController::class, 'show']);

// Item routes
Route::get('items', [ItemController::class, 'index']);
Route::get('items/random', [ItemController::class, 'random']);
Route::get('items/{id}/reviews', [ItemController::class, 'getItemWithReviews']);
Route::get('items/{id}', [ItemController::class, 'show']);
Route::post('items', [ItemController::class, 'store']);
Route::put('items/{id}', [ItemController::class, 'update']);
Route::delete('items/{id}', [ItemController::class, 'destroy']);

// Order routes
Route::get('orders', [OrderController::class, 'index']);
Route::get('orders/user/{userId}', [OrderController::class, 'getByUser']);
Route::get('orders/details/user/{userId}', [OrderController::class, 'getOrderDetailsByUser']);
Route::get('orders/{id}', [OrderController::class, 'show']);
Route::post('orders', [OrderController::class, 'store']);
Route::put('orders/{id}', [OrderController::class, 'update']);
Route::delete('orders/{id}', [OrderController::class, 'destroy']);

