<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AgrivetController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\ProductImageController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\SubCategoryController;
use App\Http\Controllers\ActivityLogController;
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

// Profile and Settings Routes (available to all authenticated users)
Route::middleware(['auth', 'session.valid'])->group(function () {
    Route::get('/profile', [UserController::class, 'showProfile'])->name('profile.show');
    Route::put('/profile', [UserController::class, 'updateProfile'])->name('profile.update');
    Route::get('/settings', [UserController::class, 'showSettings'])->name('settings.show');
    Route::put('/settings/password', [UserController::class, 'updatePassword'])->name('settings.password');
});

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

// Agrivet Management Routes
Route::middleware(['auth', 'session.valid', 'user.type:super_admin'])->prefix('dashboard/super-admin/agrivets')->name('dashboard.super-admin.agrivets.')->group(function () {
    Route::get('/', [AgrivetController::class, 'index'])->name('index');
    Route::post('/', [AgrivetController::class, 'store'])->name('store');
    
    // Shop Routes (must come before /{id} routes)
    Route::get('/{id}/shops', [AgrivetController::class, 'showShops'])->name('shops.index');
    Route::post('/{id}/shops', [AgrivetController::class, 'storeShop'])->name('shops.store');
    Route::put('/{id}/shops/{shopId}', [AgrivetController::class, 'updateShop'])->name('shops.update');
    Route::delete('/{id}/shops/{shopId}', [AgrivetController::class, 'removeShop'])->name('shops.remove');
    
    // Shop Vendors Routes
    Route::get('/{id}/shops/{shopId}/vendors', [AgrivetController::class, 'showVendors'])->name('shops.vendors.index');
    Route::post('/{id}/shops/{shopId}/vendors', [AgrivetController::class, 'storeVendor'])->name('shops.vendors.store');
    Route::put('/{id}/shops/{shopId}/vendors/{vendorId}', [AgrivetController::class, 'updateVendor'])->name('shops.vendors.update');
    Route::delete('/{id}/shops/{shopId}/vendors/{vendorId}', [AgrivetController::class, 'removeVendor'])->name('shops.vendors.remove');
    Route::post('/{id}/shops/{shopId}/vendors/add-existing', [AgrivetController::class, 'addExistingVendor'])->name('shops.vendors.add-existing');
    
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

Route::get('/dashboard/admin', function () {
    return Inertia::render('Dashboard/AdminDashboard');
})->middleware(['auth', 'session.valid', 'user.type:admin'])->name('dashboard.admin');

// Admin User Management Routes
Route::middleware(['auth', 'session.valid', 'user.type:admin'])->prefix('dashboard/admin/users')->name('dashboard.admin.users.')->group(function () {
    Route::get('/', [UserController::class, 'index'])->name('index');
    Route::post('/', [UserController::class, 'store'])->name('store');
    Route::put('/{id}', [UserController::class, 'update'])->name('update');
    Route::delete('/{id}', [UserController::class, 'deactivate'])->name('deactivate');
});

// Admin Agrivet Management Routes
Route::middleware(['auth', 'session.valid', 'user.type:admin'])->prefix('dashboard/admin/agrivets')->name('dashboard.admin.agrivets.')->group(function () {
    Route::get('/', [AgrivetController::class, 'index'])->name('index');
    Route::post('/', [AgrivetController::class, 'store'])->name('store');
    
    // Shop Routes (must come before /{id} routes)
    Route::get('/{id}/shops', [AgrivetController::class, 'showShops'])->name('shops.index');
    Route::post('/{id}/shops', [AgrivetController::class, 'storeShop'])->name('shops.store');
    Route::put('/{id}/shops/{shopId}', [AgrivetController::class, 'updateShop'])->name('shops.update');
    Route::delete('/{id}/shops/{shopId}', [AgrivetController::class, 'removeShop'])->name('shops.remove');
    
    // Shop Vendors Routes
    Route::get('/{id}/shops/{shopId}/vendors', [AgrivetController::class, 'showVendors'])->name('shops.vendors.index');
    Route::post('/{id}/shops/{shopId}/vendors', [AgrivetController::class, 'storeVendor'])->name('shops.vendors.store');
    Route::put('/{id}/shops/{shopId}/vendors/{vendorId}', [AgrivetController::class, 'updateVendor'])->name('shops.vendors.update');
    Route::delete('/{id}/shops/{shopId}/vendors/{vendorId}', [AgrivetController::class, 'removeVendor'])->name('shops.vendors.remove');
    Route::post('/{id}/shops/{shopId}/vendors/add-existing', [AgrivetController::class, 'addExistingVendor'])->name('shops.vendors.add-existing');
    
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

Route::get('/dashboard/vendor', [VendorController::class, 'index'])
    ->middleware(['auth', 'session.valid', 'user.type:vendor'])
    ->name('dashboard.vendor');

// Vendor Management Routes
Route::middleware(['auth', 'session.valid', 'user.type:vendor'])->prefix('dashboard/vendor')->name('dashboard.vendor.')->group(function () {
    // Store Management
    Route::get('/store', [VendorController::class, 'storeIndex'])->name('store.index');
    Route::post('/store', [VendorController::class, 'storeUpdate'])->name('store.update');
    
    // Products
    Route::get('/products', [VendorController::class, 'productsIndex'])->name('products.index');
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
