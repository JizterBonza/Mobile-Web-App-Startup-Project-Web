<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AgrivetController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\ProductImageController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\SubCategoryController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\PaymentMethodController;
use App\Http\Controllers\DeliveryMethodController;
use App\Http\Controllers\ZoneController;
use App\Http\Controllers\SuperAdminProductController;
use App\Http\Controllers\ProductCatalogRequestController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

Route::redirect('/admin', '/login');
Route::redirect('/register-store', '/register');

// Authentication Routes
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
Route::post('/register', [AuthController::class, 'register']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
Route::get('/session/check', [AuthController::class, 'checkSession'])->middleware('auth');

// Profile and Settings Routes (available to all authenticated users)
Route::middleware(['auth', 'session.valid'])->group(function () {
    Route::get('/profile', [UserController::class, 'showProfile'])->name('profile.show');
    Route::put('/profile', [UserController::class, 'updateProfile'])->name('profile.update');
    Route::get('/settings', [UserController::class, 'showSettings'])->name('settings.show');
    Route::put('/settings/password', [UserController::class, 'updatePassword'])->name('settings.password');
});

// Protected Routes - User Type Specific Dashboards
Route::get('/dashboard/super-admin', [DashboardController::class, 'superAdmin'])
    ->middleware(['auth', 'session.valid', 'user.type:super_admin'])->name('dashboard.super-admin');

Route::get('/dashboard/super-admin/products/create', [SuperAdminProductController::class, 'create'])
    ->middleware(['auth', 'session.valid', 'user.type:super_admin'])
    ->name('dashboard.super-admin.products.create');

Route::post('/dashboard/super-admin/products', [SuperAdminProductController::class, 'store'])
    ->middleware(['auth', 'session.valid', 'user.type:super_admin'])
    ->name('dashboard.super-admin.products.store');

Route::get('/dashboard/super-admin/products', [SuperAdminProductController::class, 'index'])
    ->middleware(['auth', 'session.valid', 'user.type:super_admin'])
    ->name('dashboard.super-admin.products');

Route::get('/dashboard/super-admin/products/{id}', [SuperAdminProductController::class, 'show'])
    ->middleware(['auth', 'session.valid', 'user.type:super_admin'])
    ->name('dashboard.super-admin.products.show');

Route::get('/dashboard/super-admin/product-requests', [ProductCatalogRequestController::class, 'index'])
    ->middleware(['auth', 'session.valid', 'user.type:super_admin'])
    ->name('dashboard.super-admin.product-requests');

Route::post('/dashboard/super-admin/product-requests/{id}/approve', [ProductCatalogRequestController::class, 'approve'])
    ->middleware(['auth', 'session.valid', 'user.type:super_admin'])
    ->name('dashboard.super-admin.product-requests.approve');

Route::post('/dashboard/super-admin/product-requests/{id}/reject', [ProductCatalogRequestController::class, 'reject'])
    ->middleware(['auth', 'session.valid', 'user.type:super_admin'])
    ->name('dashboard.super-admin.product-requests.reject');

// User Management Routes
Route::middleware(['auth', 'session.valid', 'user.type:super_admin'])->prefix('dashboard/super-admin/users')->name('dashboard.super-admin.users.')->group(function () {
    Route::get('/', [UserController::class, 'index'])->name('index');
    Route::get('/add-admin', [UserController::class, 'createAdmin'])->name('add-admin');
    Route::get('/add-super-admin', [UserController::class, 'createSuperAdmin'])->name('add-super-admin');
    Route::get('/vendor-registration', [UserController::class, 'vendorRegistration'])->name('vendor-registration');
    Route::get('/veterinarian-registration', [UserController::class, 'veterinarianRegistration'])->name('veterinarian-registration');
    Route::get('/rider-registration', [UserController::class, 'riderRegistration'])->name('rider-registration');
    Route::post('/clear-all-data', [UserController::class, 'clearAllPlatformData'])->name('clear-all-data');
    Route::post('/', [UserController::class, 'store'])->name('store');
    Route::put('/{id}', [UserController::class, 'update'])->name('update');
    Route::delete('/{id}', [UserController::class, 'deactivate'])->name('deactivate');
});

// Agrivet Management Routes
Route::middleware(['auth', 'session.valid', 'user.type:super_admin'])->prefix('dashboard/super-admin/agrivets')->name('dashboard.super-admin.agrivets.')->group(function () {
    Route::get('/', [AgrivetController::class, 'index'])->name('index');
    Route::get('/create', [AgrivetController::class, 'create'])->name('create');
    Route::post('/setup-wizard', [AgrivetController::class, 'storeSetupWizard'])->name('setup-wizard.store');
    Route::post('/', [AgrivetController::class, 'store'])->name('store');
    
    // Shop Routes (must come before /{id} routes)
    Route::get('/{id}/shops', [AgrivetController::class, 'showShops'])->name('shops.index');
    Route::post('/{id}/shops', [AgrivetController::class, 'storeShop'])->name('shops.store');
    Route::put('/{id}/shops/{shopId}', [AgrivetController::class, 'updateShop'])->name('shops.update');
    Route::delete('/{id}/shops/{shopId}', [AgrivetController::class, 'removeShop'])->name('shops.remove');
    Route::get('/{id}/shops/{shopId}/store-information', [AgrivetController::class, 'showStoreInformation'])->name('shops.store-information');
    Route::post('/{id}/shops/{shopId}/cover-photo', [AgrivetController::class, 'updateShopCoverPhoto'])->name('shops.cover-photo');

    // Shop Vendors Routes
    Route::get('/{id}/shops/{shopId}/vendors', [AgrivetController::class, 'showVendors'])->name('shops.vendors.index');
    Route::post('/{id}/shops/{shopId}/vendors', [AgrivetController::class, 'storeVendor'])->name('shops.vendors.store');
    Route::put('/{id}/shops/{shopId}/vendors/{vendorId}', [AgrivetController::class, 'updateVendor'])->name('shops.vendors.update');
    Route::delete('/{id}/shops/{shopId}/vendors/{vendorId}', [AgrivetController::class, 'removeVendor'])->name('shops.vendors.remove');
    Route::post('/{id}/shops/{shopId}/vendors/add-existing', [AgrivetController::class, 'addExistingVendor'])->name('shops.vendors.add-existing');
    Route::post('/{id}/shops/{shopId}/vendors/{vendorId}/reassign', [AgrivetController::class, 'reassignVendor'])->name('shops.vendors.reassign');

    Route::put('/{id}', [AgrivetController::class, 'update'])->name('update');
    Route::delete('/{id}', [AgrivetController::class, 'destroy'])->name('destroy');
});

// Super Admin Category Management Routes
Route::middleware(['auth', 'session.valid', 'user.type:super_admin'])->prefix('dashboard/super-admin/categories')->name('dashboard.super-admin.categories.')->group(function () {
    Route::get('/', [CategoryController::class, 'dashboardIndex'])->name('index');
    Route::post('/', [CategoryController::class, 'store'])->name('store');
    Route::put('/{id}', [CategoryController::class, 'update'])->name('update');
    Route::delete('/{id}', [CategoryController::class, 'destroy'])->name('destroy');
});

// Super Admin Sub-Category Management Routes
Route::middleware(['auth', 'session.valid', 'user.type:super_admin'])->prefix('dashboard/super-admin/sub-categories')->name('dashboard.super-admin.sub-categories.')->group(function () {
    Route::get('/', [SubCategoryController::class, 'dashboardIndex'])->name('index');
    Route::post('/', [SubCategoryController::class, 'store'])->name('store');
    Route::put('/{id}', [SubCategoryController::class, 'update'])->name('update');
    Route::delete('/{id}', [SubCategoryController::class, 'destroy'])->name('destroy');
});

// Super Admin Activity Logs (audit trail)
Route::middleware(['auth', 'session.valid', 'user.type:super_admin'])->prefix('dashboard/super-admin/activity-logs')->name('dashboard.super-admin.activity-logs.')->group(function () {
    Route::get('/', [ActivityLogController::class, 'index'])->name('index');
    Route::get('/{id}', [ActivityLogController::class, 'show'])->name('show');
});

// Super Admin Payment Methods
Route::middleware(['auth', 'session.valid', 'user.type:super_admin'])->prefix('dashboard/super-admin/payment-methods')->name('dashboard.super-admin.payment-methods.')->group(function () {
    Route::get('/', [PaymentMethodController::class, 'index'])->name('index');
    Route::post('/', [PaymentMethodController::class, 'store'])->name('store');
    Route::put('/{id}', [PaymentMethodController::class, 'update'])->name('update');
    Route::delete('/{id}', [PaymentMethodController::class, 'destroy'])->name('destroy');
});

// Super Admin Delivery Methods
Route::middleware(['auth', 'session.valid', 'user.type:super_admin'])->prefix('dashboard/super-admin/delivery-methods')->name('dashboard.super-admin.delivery-methods.')->group(function () {
    Route::get('/', [DeliveryMethodController::class, 'index'])->name('index');
    Route::post('/', [DeliveryMethodController::class, 'store'])->name('store');
    Route::put('/{id}', [DeliveryMethodController::class, 'update'])->name('update');
    Route::delete('/{id}', [DeliveryMethodController::class, 'destroy'])->name('destroy');
});

// Super Admin Zones
Route::middleware(['auth', 'session.valid', 'user.type:super_admin'])->prefix('dashboard/super-admin/zones')->name('dashboard.super-admin.zones.')->group(function () {
    Route::get('/', [ZoneController::class, 'index'])->name('index');
    Route::post('/', [ZoneController::class, 'store'])->name('store');
    Route::put('/{id}', [ZoneController::class, 'update'])->name('update');
    Route::delete('/{id}', [ZoneController::class, 'destroy'])->name('destroy');
});

Route::middleware(['auth', 'session.valid', 'user.type:owner_manager'])->prefix('dashboard/owner-manager')->name('dashboard.owner-manager.')->group(function () {
    Route::get('/', [DashboardController::class, 'ownerManager'])->name('index');
    Route::get('/stores', [DashboardController::class, 'ownerManagerStores'])->name('stores');
    Route::get('/stores/{shopId}/store-information', [DashboardController::class, 'ownerManagerStoreInformation'])->name('stores.store-information');
    Route::put('/stores/{shopId}', [DashboardController::class, 'ownerManagerUpdateShop'])->name('stores.update');
    Route::post('/stores/{shopId}/cover-photo', [DashboardController::class, 'ownerManagerUpdateShopCoverPhoto'])->name('stores.cover-photo');
    Route::post('/stores/{shopId}/listings', [DashboardController::class, 'ownerManagerStoreShopListing'])->name('stores.listings.store');
    Route::get('/stores/{shopId}/products/create', [DashboardController::class, 'ownerManagerProductsCreate'])->name('stores.products.create');
    Route::post('/stores/{shopId}/product-catalog', [DashboardController::class, 'ownerManagerProductCatalogStore'])->name('stores.product-catalog.store');
    Route::post('/stores/{shopId}/vendors/{vendorId}/reassign', [DashboardController::class, 'ownerManagerReassignVendor'])->name('stores.vendors.reassign');
    Route::get('/vendor-registration', [UserController::class, 'vendorRegistration'])->name('vendor-registration');
    Route::post('/stores/{shopId}/vendors', [DashboardController::class, 'ownerManagerStoreVendor'])->name('stores.vendors.store');
    Route::get('/orders', [DashboardController::class, 'ownerManagerOrders'])->name('orders');
    Route::patch('/orders/{orderId}/accept', [DashboardController::class, 'ownerManagerAcceptOrder'])->name('orders.accept');
    Route::patch('/orders/{orderId}/decline', [DashboardController::class, 'ownerManagerDeclineOrder'])->name('orders.decline');
    Route::patch('/orders/{orderId}/ready', [DashboardController::class, 'ownerManagerMarkOrderReady'])->name('orders.ready');
    Route::patch('/orders/{orderId}/items/{orderItemId}/done-preparing', [DashboardController::class, 'ownerManagerDonePreparingItem'])->name('orders.items.done-preparing');
});

Route::get('/dashboard/admin', [DashboardController::class, 'admin'])
    ->middleware(['auth', 'session.valid', 'user.type:admin'])->name('dashboard.admin');

Route::get('/dashboard/admin/products/create', [SuperAdminProductController::class, 'create'])
    ->middleware(['auth', 'session.valid', 'user.type:admin'])
    ->name('dashboard.admin.products.create');

Route::post('/dashboard/admin/products', [SuperAdminProductController::class, 'store'])
    ->middleware(['auth', 'session.valid', 'user.type:admin'])
    ->name('dashboard.admin.products.store');

Route::get('/dashboard/admin/products', [SuperAdminProductController::class, 'index'])
    ->middleware(['auth', 'session.valid', 'user.type:admin'])
    ->name('dashboard.admin.products');

Route::get('/dashboard/admin/product-requests', [ProductCatalogRequestController::class, 'index'])
    ->middleware(['auth', 'session.valid', 'user.type:admin'])
    ->name('dashboard.admin.product-requests');

Route::post('/dashboard/admin/product-requests/{id}/approve', [ProductCatalogRequestController::class, 'approve'])
    ->middleware(['auth', 'session.valid', 'user.type:admin'])
    ->name('dashboard.admin.product-requests.approve');

Route::post('/dashboard/admin/product-requests/{id}/reject', [ProductCatalogRequestController::class, 'reject'])
    ->middleware(['auth', 'session.valid', 'user.type:admin'])
    ->name('dashboard.admin.product-requests.reject');

Route::get('/dashboard/admin/products/{id}', [SuperAdminProductController::class, 'show'])
    ->middleware(['auth', 'session.valid', 'user.type:admin'])
    ->name('dashboard.admin.products.show');

// Admin User Management Routes
Route::middleware(['auth', 'session.valid', 'user.type:admin'])->prefix('dashboard/admin/users')->name('dashboard.admin.users.')->group(function () {
    Route::get('/', [UserController::class, 'index'])->name('index');
    Route::get('/vendor-registration', [UserController::class, 'vendorRegistration'])->name('vendor-registration');
    Route::get('/veterinarian-registration', [UserController::class, 'veterinarianRegistration'])->name('veterinarian-registration');
    Route::get('/rider-registration', [UserController::class, 'riderRegistration'])->name('rider-registration');
    Route::post('/', [UserController::class, 'store'])->name('store');
    Route::put('/{id}', [UserController::class, 'update'])->name('update');
    Route::delete('/{id}', [UserController::class, 'deactivate'])->name('deactivate');
});

// Admin Agrivet Management Routes
Route::middleware(['auth', 'session.valid', 'user.type:admin'])->prefix('dashboard/admin/agrivets')->name('dashboard.admin.agrivets.')->group(function () {
    Route::get('/', [AgrivetController::class, 'index'])->name('index');
    Route::get('/create', [AgrivetController::class, 'create'])->name('create');
    Route::post('/setup-wizard', [AgrivetController::class, 'storeSetupWizard'])->name('setup-wizard.store');
    Route::post('/', [AgrivetController::class, 'store'])->name('store');
    
    // Shop Routes (must come before /{id} routes)
    Route::get('/{id}/shops', [AgrivetController::class, 'showShops'])->name('shops.index');
    Route::post('/{id}/shops', [AgrivetController::class, 'storeShop'])->name('shops.store');
    Route::put('/{id}/shops/{shopId}', [AgrivetController::class, 'updateShop'])->name('shops.update');
    Route::delete('/{id}/shops/{shopId}', [AgrivetController::class, 'removeShop'])->name('shops.remove');
    Route::get('/{id}/shops/{shopId}/store-information', [AgrivetController::class, 'showStoreInformation'])->name('shops.store-information');
    Route::post('/{id}/shops/{shopId}/cover-photo', [AgrivetController::class, 'updateShopCoverPhoto'])->name('shops.cover-photo');

    // Shop Vendors Routes
    Route::get('/{id}/shops/{shopId}/vendors', [AgrivetController::class, 'showVendors'])->name('shops.vendors.index');
    Route::post('/{id}/shops/{shopId}/vendors', [AgrivetController::class, 'storeVendor'])->name('shops.vendors.store');
    Route::put('/{id}/shops/{shopId}/vendors/{vendorId}', [AgrivetController::class, 'updateVendor'])->name('shops.vendors.update');
    Route::delete('/{id}/shops/{shopId}/vendors/{vendorId}', [AgrivetController::class, 'removeVendor'])->name('shops.vendors.remove');
    Route::post('/{id}/shops/{shopId}/vendors/add-existing', [AgrivetController::class, 'addExistingVendor'])->name('shops.vendors.add-existing');
    Route::post('/{id}/shops/{shopId}/vendors/{vendorId}/reassign', [AgrivetController::class, 'reassignVendor'])->name('shops.vendors.reassign');

    Route::put('/{id}', [AgrivetController::class, 'update'])->name('update');
    Route::delete('/{id}', [AgrivetController::class, 'destroy'])->name('destroy');
});

// Admin Category Management Routes
Route::middleware(['auth', 'session.valid', 'user.type:admin'])->prefix('dashboard/admin/categories')->name('dashboard.admin.categories.')->group(function () {
    Route::get('/', [CategoryController::class, 'dashboardIndex'])->name('index');
    Route::post('/', [CategoryController::class, 'store'])->name('store');
    Route::put('/{id}', [CategoryController::class, 'update'])->name('update');
    Route::delete('/{id}', [CategoryController::class, 'destroy'])->name('destroy');
});

// Admin Sub-Category Management Routes
Route::middleware(['auth', 'session.valid', 'user.type:admin'])->prefix('dashboard/admin/sub-categories')->name('dashboard.admin.sub-categories.')->group(function () {
    Route::get('/', [SubCategoryController::class, 'dashboardIndex'])->name('index');
    Route::post('/', [SubCategoryController::class, 'store'])->name('store');
    Route::put('/{id}', [SubCategoryController::class, 'update'])->name('update');
    Route::delete('/{id}', [SubCategoryController::class, 'destroy'])->name('destroy');
});

// Admin Activity Logs (audit trail)
Route::middleware(['auth', 'session.valid', 'user.type:admin'])->prefix('dashboard/admin/activity-logs')->name('dashboard.admin.activity-logs.')->group(function () {
    Route::get('/', [ActivityLogController::class, 'index'])->name('index');
    Route::get('/{id}', [ActivityLogController::class, 'show'])->name('show');
});

// Admin Payment Methods
Route::middleware(['auth', 'session.valid', 'user.type:admin'])->prefix('dashboard/admin/payment-methods')->name('dashboard.admin.payment-methods.')->group(function () {
    Route::get('/', [PaymentMethodController::class, 'index'])->name('index');
    Route::post('/', [PaymentMethodController::class, 'store'])->name('store');
    Route::put('/{id}', [PaymentMethodController::class, 'update'])->name('update');
    Route::delete('/{id}', [PaymentMethodController::class, 'destroy'])->name('destroy');
});

// Admin Delivery Methods
Route::middleware(['auth', 'session.valid', 'user.type:admin'])->prefix('dashboard/admin/delivery-methods')->name('dashboard.admin.delivery-methods.')->group(function () {
    Route::get('/', [DeliveryMethodController::class, 'index'])->name('index');
    Route::post('/', [DeliveryMethodController::class, 'store'])->name('store');
    Route::put('/{id}', [DeliveryMethodController::class, 'update'])->name('update');
    Route::delete('/{id}', [DeliveryMethodController::class, 'destroy'])->name('destroy');
});

// Admin Zones
Route::middleware(['auth', 'session.valid', 'user.type:admin'])->prefix('dashboard/admin/zones')->name('dashboard.admin.zones.')->group(function () {
    Route::get('/', [ZoneController::class, 'index'])->name('index');
    Route::post('/', [ZoneController::class, 'store'])->name('store');
    Route::put('/{id}', [ZoneController::class, 'update'])->name('update');
    Route::delete('/{id}', [ZoneController::class, 'destroy'])->name('destroy');
});

Route::get('/dashboard/vendor', [VendorController::class, 'index'])
    ->middleware(['auth', 'session.valid', 'user.type:vendor'])
    ->name('dashboard.vendor');

Route::post('/dashboard/vendor/shop-listings', [VendorController::class, 'storeShopListing'])
    ->middleware(['auth', 'session.valid', 'user.type:vendor'])
    ->name('dashboard.vendor.shop-listings.store');

// Vendor Management Routes
Route::middleware(['auth', 'session.valid', 'user.type:vendor'])->prefix('dashboard/vendor')->name('dashboard.vendor.')->group(function () {
    // Store Management
    Route::get('/store', [VendorController::class, 'storeIndex'])->name('store.index');
    Route::post('/store', [VendorController::class, 'storeUpdate'])->name('store.update');
    
    // Products
    Route::get('/products', [VendorController::class, 'productsIndex'])->name('products.index');
    Route::get('/products/create', [VendorController::class, 'productsCreate'])->name('products.create');
    Route::post('/product-catalog', [VendorController::class, 'productCatalogStore'])->name('product-catalog.store');
    Route::post('/products', [VendorController::class, 'productsStore'])->name('products.store');
    Route::put('/products/{id}', [VendorController::class, 'productsUpdate'])->name('products.update');
    Route::delete('/products/{id}', [VendorController::class, 'productsDestroy'])->name('products.destroy');
    
    // Inventory
    Route::get('/inventory', [VendorController::class, 'inventoryIndex'])->name('inventory.index');
    Route::put('/inventory/{id}', [VendorController::class, 'inventoryUpdate'])->name('inventory.update');
    
    // Orders
    Route::get('/orders', [VendorController::class, 'ordersIndex'])->name('orders.index');
    Route::get('/orders/{orderId}/items', [VendorController::class, 'orderItemsIndex'])->name('orders.items.index');
    Route::put('/orders/{id}', [VendorController::class, 'ordersUpdate'])->name('orders.update');

    // Store-scoped order management (vendor's assigned shop only)
    Route::patch('/stores/{shopId}/orders/{orderId}/accept', [VendorController::class, 'storeOrderAccept'])->name('stores.orders.accept');
    Route::patch('/stores/{shopId}/orders/{orderId}/decline', [VendorController::class, 'storeOrderDecline'])->name('stores.orders.decline');
    Route::patch('/stores/{shopId}/orders/{orderId}/ready', [VendorController::class, 'storeOrderReady'])->name('stores.orders.ready');
    Route::patch('/stores/{shopId}/orders/{orderId}/items/{orderItemId}/done-preparing', [VendorController::class, 'storeOrderDonePreparingItem'])->name('stores.orders.items.done-preparing');
    
    // Payouts
    Route::get('/payouts', [VendorController::class, 'payoutsIndex'])->name('payouts.index');
    
    // Promotions
    Route::get('/promotions', [VendorController::class, 'promotionsIndex'])->name('promotions.index');
    Route::post('/promotions', [VendorController::class, 'promotionsStore'])->name('promotions.store');
    Route::put('/promotions/{id}', [VendorController::class, 'promotionsUpdate'])->name('promotions.update');
    Route::delete('/promotions/{id}', [VendorController::class, 'promotionsDestroy'])->name('promotions.destroy');
    
    // Product Images (Stock)
    Route::get('/product-images', [ProductImageController::class, 'index'])->name('product-images.index');
    Route::post('/product-images', [ProductImageController::class, 'store'])->name('product-images.store');
    Route::put('/product-images/{id}', [ProductImageController::class, 'update'])->name('product-images.update');
    Route::delete('/product-images/{id}', [ProductImageController::class, 'destroy'])->name('product-images.destroy');
    Route::get('/product-images/active', [ProductImageController::class, 'getActiveImages'])->name('product-images.active');
});

Route::get('/dashboard/veterinarian', function () {
    return Inertia::render('Dashboard/VeterinarianDashboard');
})->middleware(['auth', 'session.valid', 'user.type:veterinarian'])->name('dashboard.veterinarian');

// Legacy dashboard route - redirect to user's specific dashboard
Route::get('/dashboard', function () {
    $user = auth()->user();
    return redirect($user->getDashboardUrl());
})->middleware(['auth', 'session.valid']);
