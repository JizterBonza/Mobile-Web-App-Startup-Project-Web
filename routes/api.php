<?php

use App\Http\Controllers\Api\SocialAuthController;
use App\Http\Controllers\MobileAuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PODController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\AddressController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\MobileController;
use App\Http\Controllers\PaymentMethodController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\VoucherApiController;
use App\Http\Controllers\CustomerShopMessageController;
use Illuminate\Broadcasting\BroadcastController;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/

Route::post('register', [MobileAuthController::class, 'register']);
Route::post('login', [MobileAuthController::class, 'login']);
Route::post('refresh', [MobileAuthController::class, 'refresh']);
Route::post('forgot-password', [MobileAuthController::class, 'forgotPassword']);
Route::post('reset-password', [MobileAuthController::class, 'resetPassword']);
Route::post('auth/google/token', [SocialAuthController::class, 'googleToken']);

Route::prefix('auth')->group(function () {
    Route::get('{provider}/redirect', [SocialAuthController::class, 'redirect']);
    Route::get('{provider}/callback', [SocialAuthController::class, 'callback']);
});

// Catalog / search
Route::get('search', [SearchController::class, 'index']);

Route::get('categories', [CategoryController::class, 'index']);
Route::get('categories/{id}', [CategoryController::class, 'show']);

Route::get('/items/search', [ItemController::class, 'search']);
Route::get('items', [ItemController::class, 'index']);
Route::get('items/random', [ItemController::class, 'random']);
Route::get('items/on-sale', [ItemController::class, 'onSale']);
Route::get('items/bundled', [ItemController::class, 'bundled']);
Route::get('items/shop/{shopId}/category/{categoryId}', [ItemController::class, 'getByShopAndCategory']);
// Must be registered before items/{id} so "ordered" is not captured as an id
Route::get('items/ordered/user/{userId}', [ItemController::class, 'getOrderedByUser'])
    ->middleware('auth:sanctum');
Route::get('items/{id}/reviews', [ItemController::class, 'getItemWithReviews']);
Route::get('items/{id}', [ItemController::class, 'show']);

Route::get('shops/search', [ShopController::class, 'search']);
Route::get('shops/nearby', [ShopController::class, 'nearby']);
Route::get('shops', [ShopController::class, 'index']);
Route::get('shops/agrivet/{agrivetId}', [ShopController::class, 'getByAgrivetId']);
Route::get('shops/{id}/items', [ShopController::class, 'getShopWithItems']);
Route::get('shops/{id}/reviews', [ShopController::class, 'getShopWithReviews']);
Route::get('shops/{id}', [ShopController::class, 'show']);

// Reference data
Route::get('delivery-methods', [MobileController::class, 'getDeliveryMethods']);
Route::get('payment-methods/active', [PaymentMethodController::class, 'getActive']);
Route::get('order-statuses', [MobileController::class, 'getOrderStatuses']);
Route::get('addresses/types', [AddressController::class, 'getAddressTypes']);

// PayMongo callbacks (signature / redirect — not bearer-auth)
Route::get('/payment-success', [PaymentController::class, 'paymentSuccess']);
Route::get('/payment-cancel', [PaymentController::class, 'paymentCancel']);
Route::post('/payment/webhook', [PaymentController::class, 'handleWebhook']);

/*
|--------------------------------------------------------------------------
| Authenticated routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {
    // Private channel auth for mobile (Sanctum Bearer token)
    Route::post('broadcasting/auth', [BroadcastController::class, 'authenticate']);

    // Session / profile
    Route::post('logout', [MobileAuthController::class, 'logout']);
    Route::get('profile', function (Request $request) {
        return response()->json($request->user());
    });
    Route::get('badges', [MobileController::class, 'badges']);
    Route::put('profile/update', [UserController::class, 'updateMobile']);
    Route::put('profile/change-password', [UserController::class, 'updatePasswordMobile']);

    // Vouchers / checkout
    Route::post('vouchers/validate', [VoucherApiController::class, 'validateCode']);
    Route::post('orders/calculate-fee', [OrderController::class, 'calculateFee']);
    Route::post('orders/create', [OrderController::class, 'store']);

    // Orders
    Route::get('orders', [OrderController::class, 'index']);
    Route::get('orders/user/{userId}', [OrderController::class, 'getByUser']);
    Route::get('orders/rider/{riderId}', [OrderController::class, 'getByRider']);
    Route::get('orders/details/user/{userId}', [OrderController::class, 'getOrderDetailsByUser']);
    Route::get('orders/{id}', [OrderController::class, 'show']);
    Route::put('orders/{id}', [OrderController::class, 'update']);
    Route::put('orders/{id}/status', [OrderController::class, 'updateStatus']);
    Route::delete('orders/{id}', [OrderController::class, 'destroy']);

    // Item CRUD (vendor/admin — auth required; role checks can be added later)
    Route::post('items', [ItemController::class, 'store']);
    Route::put('items/{id}', [ItemController::class, 'update']);
    Route::delete('items/{id}', [ItemController::class, 'destroy']);

    // Shop reviews + shop CRUD
    Route::post('shops/{id}/reviews', [ShopController::class, 'storeReview']);
    Route::post('shops', [ShopController::class, 'store']);
    Route::put('shops/{id}', [ShopController::class, 'update']);
    Route::delete('shops/{id}', [ShopController::class, 'destroy']);

    // Proof of Delivery
    Route::post('pod/upload', [PODController::class, 'store']);
    Route::get('pod/order/{orderId}', [PODController::class, 'getByOrder']);
    Route::get('pod/rider/{riderId}', [PODController::class, 'getByRider']);
    Route::get('pod/show/{id}', [PODController::class, 'show']);
    Route::put('pod/update/{id}', [PODController::class, 'update']);
    Route::delete('pod/delete/{id}', [PODController::class, 'destroy']);

    // Cart
    Route::get('carts', [CartController::class, 'index']);
    Route::get('carts/user/{userId}', [CartController::class, 'getByUser']);
    Route::get('carts/user/{userId}/count', [CartController::class, 'countByUser']);
    Route::get('carts/{id}', [CartController::class, 'show']);
    Route::post('carts/add', [CartController::class, 'store']);
    Route::put('carts/{id}', [CartController::class, 'update']);
    Route::delete('carts/delete/{id}', [CartController::class, 'destroy']);
    Route::post('carts/clear', [CartController::class, 'clear']);

    // Favorites
    Route::get('favorites', [FavoriteController::class, 'index']);
    Route::get('favorites/user/{userId}', [FavoriteController::class, 'getByUser']);
    Route::get('favorites/{id}', [FavoriteController::class, 'show']);
    Route::post('favorites/add', [FavoriteController::class, 'store']);
    Route::delete('favorites/delete/{id}', [FavoriteController::class, 'destroy']);
    Route::post('favorites/remove', [FavoriteController::class, 'removeByUserAndItem']);
    Route::post('favorites/toggle', [FavoriteController::class, 'toggle']);
    Route::post('favorites/check', [FavoriteController::class, 'check']);

    // Addresses
    Route::get('addresses', [AddressController::class, 'index']);
    Route::get('addresses/user/{userId}', [AddressController::class, 'getByUser']);
    Route::get('addresses/user/{userId}/default', [AddressController::class, 'getDefault']);
    Route::get('addresses/{id}', [AddressController::class, 'show']);
    Route::post('addresses', [AddressController::class, 'store']);
    Route::put('addresses/{id}', [AddressController::class, 'update']);
    Route::put('addresses/{id}/set-default', [AddressController::class, 'setDefault']);
    Route::delete('addresses/{id}', [AddressController::class, 'destroy']);
    Route::post('addresses/{id}/restore', [AddressController::class, 'restore']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/by-category', [NotificationController::class, 'byCategory']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::get('/notifications/user/{userId}/unread-count', [NotificationController::class, 'unreadCountByUser']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::delete('/notifications/clear-read', [NotificationController::class, 'clearRead']);

    // Customer ↔ shop messaging
    Route::get('messages', [CustomerShopMessageController::class, 'index']);
    Route::get('messages/unread-count', [CustomerShopMessageController::class, 'unreadCount']);
    Route::post('shops/{shopId}/messages', [CustomerShopMessageController::class, 'start']);
    Route::get('messages/{conversationId}', [CustomerShopMessageController::class, 'show']);
    Route::post('messages/{conversationId}', [CustomerShopMessageController::class, 'send']);

    // Activity logs (admin audit trail)
    Route::get('activity-logs', [ActivityLogController::class, 'index']);
    Route::get('activity-logs/{id}', [ActivityLogController::class, 'show']);

    // Payments (order-scoped / intent creation)
    Route::post('/payment/intent', [PaymentController::class, 'createIntent']);
    Route::post('/payment/attach', [PaymentController::class, 'attachPayment']);
    Route::post('/payment/checkout', [PaymentController::class, 'checkout']);
    Route::get('/payment/checkout-url/{orderId}', [PaymentController::class, 'getCheckoutUrlByOrderId']);
    Route::get('/payment/status/{orderId}', [PaymentController::class, 'getPaymentStatusByOrderId']);
});
