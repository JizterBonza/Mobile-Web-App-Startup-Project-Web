<?php

use App\Http\Controllers\Api\SocialAuthController;
use App\Http\Controllers\MobileAuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\AddressController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ShopController;
use Illuminate\Http\Request;

Route::post('register', [MobileAuthController::class, 'register']);
Route::post('login', [MobileAuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [MobileAuthController::class, 'logout']);
    Route::get('profile', function (Request $request) {
        return response()->json($request->user());
    });
    Route::put('profile/update', [UserController::class, 'updateMobile']);
    Route::put('profile/change-password', [UserController::class, 'updatePasswordMobile']);
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
Route::get('/items/search', [ItemController::class, 'search']);
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
Route::post('orders/create', [OrderController::class, 'store']);
Route::put('orders/{id}', [OrderController::class, 'update']);
Route::delete('orders/{id}', [OrderController::class, 'destroy']);

// Cart routes
Route::get('carts', [CartController::class, 'index']);
Route::get('carts/user/{userId}', [CartController::class, 'getByUser']);
Route::get('carts/{id}', [CartController::class, 'show']);
Route::post('carts/add', [CartController::class, 'store']);
Route::put('carts/{id}', [CartController::class, 'update']);
Route::delete('carts/delete/{id}', [CartController::class, 'destroy']);
Route::post('carts/clear', [CartController::class, 'clear']);

// Favorite routes
Route::get('favorites', [FavoriteController::class, 'index']);
Route::get('favorites/user/{userId}', [FavoriteController::class, 'getByUser']);
Route::get('favorites/{id}', [FavoriteController::class, 'show']);
Route::post('favorites/add', [FavoriteController::class, 'store']);
Route::delete('favorites/delete/{id}', [FavoriteController::class, 'destroy']);
Route::post('favorites/remove', [FavoriteController::class, 'removeByUserAndItem']);
Route::post('favorites/toggle', [FavoriteController::class, 'toggle']);
Route::post('favorites/check', [FavoriteController::class, 'check']);

// Address routes
Route::get('addresses', [AddressController::class, 'index']);
Route::get('addresses/user/{userId}', [AddressController::class, 'getByUser']);
Route::get('addresses/user/{userId}/default', [AddressController::class, 'getDefault']);
Route::get('addresses/types', [AddressController::class, 'getAddressTypes']);
Route::get('addresses/{id}', [AddressController::class, 'show']);
Route::post('addresses', [AddressController::class, 'store']);
Route::put('addresses/{id}', [AddressController::class, 'update']);
Route::put('addresses/{id}/set-default', [AddressController::class, 'setDefault']);
Route::delete('addresses/{id}', [AddressController::class, 'destroy']);
Route::post('addresses/{id}/restore', [AddressController::class, 'restore']);

// Notification routes
Route::get('/notifications', [NotificationController::class, 'index']);
Route::get('/notifications/by-category', [NotificationController::class, 'byCategory']);
Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
Route::delete('/notifications/clear-read', [NotificationController::class, 'clearRead']);

// Shop routes
Route::get('shops/search', [ShopController::class, 'search']);
Route::get('shops', [ShopController::class, 'index']);
Route::get('shops/user/{userId}', [ShopController::class, 'getByUserId']);
Route::get('shops/{id}/items', [ShopController::class, 'getShopWithItems']);
Route::get('shops/{id}/reviews', [ShopController::class, 'getShopWithReviews']);
Route::post('shops/{id}/reviews', [ShopController::class, 'storeReview']);
Route::get('shops/{id}', [ShopController::class, 'show']);
Route::post('shops', [ShopController::class, 'store']);
Route::put('shops/{id}', [ShopController::class, 'update']);
Route::delete('shops/{id}', [ShopController::class, 'destroy']);