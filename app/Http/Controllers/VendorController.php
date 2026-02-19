<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use App\Models\ActivityLog;
use App\Models\User;
use App\Models\Agrivet;
use App\Models\Shop;
use App\Models\Item;
use App\Models\Promotion;
use App\Models\ProductImage;
use App\Models\Category;
use App\Models\SubCategory;

class VendorController extends Controller
{
    /**
     * Get the vendor's Shop.
     */
    private function getVendorShop()
    {
        $vendor = auth()->user();
        $vendor->load('shops');
        
        if ($vendor->shops->isEmpty()) {
            return null;
        }
        
        // Get the first active shop (vendors typically have one)
        return $vendor->shops->first();
    }

    /**
     * Get the vendor's Agrivet (via Shop relationship).
     */
    private function getVendorAgrivet()
    {
        $shop = $this->getVendorShop();
        
        if (!$shop) {
            return null;
        }
        
        return $shop->agrivet;
    }

    /**
     * Get the vendor's Shop with its Agrivet loaded.
     */
    private function getVendorShopWithAgrivet()
    {
        $vendor = auth()->user();
        $vendor->load(['shops.agrivet']);
        
        if ($vendor->shops->isEmpty()) {
            return null;
        }
        
        return $vendor->shops->first();
    }

    /**
     * Display the vendor dashboard.
     */
    public function index()
    {
        $shop = $this->getVendorShopWithAgrivet();

        if (!$shop) {
            return Inertia::render('Dashboard/VendorDashboard', [
                'shop' => null,
                'agrivet' => null,
                'stats' => [
                    'new_orders' => 0,
                    'products' => 0,
                    'pending_reviews' => 0,
                    'total_revenue' => 0,
                ],
            ]);
        }

        $agrivet = $shop->agrivet;

        // Get dashboard stats
        $productsCount = DB::table('items')
            ->where('shop_id', $shop->id)
            ->count();

        $newOrdersCount = DB::table('order_items')
            ->join('items', 'order_items.item_id', '=', 'items.id')
            ->where('items.shop_id', $shop->id)
            ->where('order_items.item_status', 'ordered')
            ->count();

        $totalRevenue = DB::table('order_items')
            ->join('items', 'order_items.item_id', '=', 'items.id')
            ->where('items.shop_id', $shop->id)
            ->where('order_items.item_status', 'delivered')
            ->sum(DB::raw('order_items.quantity * order_items.price_at_purchase'));

        return Inertia::render('Dashboard/VendorDashboard', [
            'shop' => [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
                'shop_description' => $shop->shop_description,
                'shop_address' => $shop->shop_address,
                'average_rating' => $shop->average_rating,
                'total_reviews' => $shop->total_reviews,
                'shop_status' => $shop->shop_status,
            ],
            'agrivet' => $agrivet ? [
                'id' => $agrivet->id,
                'name' => $agrivet->name,
            ] : null,
            'stats' => [
                'new_orders' => $newOrdersCount,
                'products' => $productsCount,
                'pending_reviews' => 0, // Can be implemented later
                'total_revenue' => $totalRevenue ?? 0,
            ],
        ]);
    }

    /**
     * Display store management page.
     */
    public function storeIndex()
    {
        $shop = $this->getVendorShopWithAgrivet();

        if (!$shop) {
            return redirect()->route('dashboard.vendor')
                ->with('error', 'You are not associated with any Shop. Please contact an administrator.');
        }

        $agrivet = $shop->agrivet;

        return Inertia::render('Dashboard/Vendor/StoreManagement', [
            'shop' => [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
                'shop_description' => $shop->shop_description,
                'shop_address' => $shop->shop_address,
                'shop_lat' => $shop->shop_lat,
                'shop_long' => $shop->shop_long,
                'contact_number' => $shop->contact_number,
                'average_rating' => $shop->average_rating,
                'total_reviews' => $shop->total_reviews,
                'shop_status' => $shop->shop_status,
                'created_at' => $shop->created_at,
                'updated_at' => $shop->updated_at,
            ],
            'agrivet' => $agrivet ? [
                'id' => $agrivet->id,
                'name' => $agrivet->name,
                'description' => $agrivet->description,
                'contact_number' => $agrivet->contact_number,
                'email' => $agrivet->email,
                'logo_url' => $agrivet->logo_url,
                'status' => $agrivet->status,
            ] : null,
        ]);
    }

    /**
     * Store or update store information.
     */
    public function storeUpdate(Request $request)
    {
        $shop = $this->getVendorShop();

        if (!$shop) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Shop.']);
        }

        $request->validate([
            'shop_name' => 'required|string|max:150',
            'shop_description' => 'nullable|string',
            'shop_address' => 'nullable|string|max:255',
            'shop_lat' => 'nullable|numeric',
            'shop_long' => 'nullable|numeric',
            'contact_number' => 'nullable|string|max:20',
            'shop_status' => 'nullable|string|in:active,inactive',
        ]);

        $shop->update([
            'shop_name' => $request->shop_name,
            'shop_description' => $request->shop_description,
            'shop_address' => $request->shop_address,
            'shop_lat' => $request->shop_lat,
            'shop_long' => $request->shop_long,
            'contact_number' => $request->contact_number,
            'shop_status' => $request->shop_status ?? $shop->shop_status,
        ]);

        return redirect()->route('dashboard.vendor.store.index')
            ->with('success', 'Shop information updated successfully.');
    }

    /**
     * Display products listing.
     */
    public function productsIndex()
    {
        $shop = $this->getVendorShopWithAgrivet();

        if (!$shop) {
            return redirect()->route('dashboard.vendor')
                ->with('error', 'You are not associated with any Shop.');
        }

        // Get products for this shop with category and sub_category names
        $products = DB::table('items')
            ->leftJoin('category', 'items.category', '=', 'category.id')
            ->leftJoin('sub_categories', 'items.sub_category_id', '=', 'sub_categories.id')
            ->where('items.shop_id', $shop->id)
            ->select(
                'items.*',
                'category.category_name',
                'sub_categories.sub_category_name'
            )
            ->orderBy('items.created_at', 'desc')
            ->get();

        $products = $products->map(function ($item) {
            // Normalize image URLs to ensure they're properly formatted
            $images = $item->item_images ? json_decode($item->item_images, true) : [];
            if (!empty($images)) {
                $images = array_map(function ($image) {
                    if (is_string($image)) {
                        if (preg_match('/^https?:\/\//', $image)) {
                            return $image;
                        }
                        if (strpos($image, '/storage/') === 0) {
                            return $image;
                        }
                        if (strpos($image, 'products/') !== false) {
                            return '/storage/' . $image;
                        }
                        return '/storage/products/' . basename($image);
                    }
                    return $image;
                }, $images);
            }
            
            return [
                'id' => $item->id,
                'item_name' => $item->item_name,
                'item_description' => $item->item_description,
                'item_price' => $item->item_price,
                'item_quantity' => $item->item_quantity,
                'weight' => $item->weight,
                'metric' => $item->metric,
                'category' => $item->category,
                'category_name' => $item->category_name,
                'sub_category_id' => $item->sub_category_id,
                'sub_category_name' => $item->sub_category_name,
                'item_images' => $images,
                'item_status' => $item->item_status,
                'average_rating' => $item->average_rating,
                'total_reviews' => $item->total_reviews,
                'sold_count' => $item->sold_count,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
            ];
        });

        // Get stock images for this shop's agrivet (shared across shops in same agrivet)
        $agrivet = $shop->agrivet;
        $stockImages = $agrivet ? ProductImage::where('agrivet_id', $agrivet->id)
            ->where('status', 'active')
            ->orderBy('category')
            ->orderBy('name')
            ->get()
            ->map(function ($image) {
                return [
                    'id' => $image->id,
                    'name' => $image->name,
                    'image_url' => $image->image_url,
                    'category' => $image->category,
                ];
            }) : collect([]);

        // Get categories and sub_categories from database
        $categories = Category::where('status', 'active')
            ->orderBy('category_name')
            ->get()
            ->map(function ($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->category_name,
                ];
            });

        $subCategories = SubCategory::where('sub_category_status', 'active')
            ->orderBy('sub_category_name')
            ->get()
            ->map(function ($subCategory) {
                return [
                    'id' => $subCategory->id,
                    'name' => $subCategory->sub_category_name,
                ];
            });

        return Inertia::render('Dashboard/Vendor/Products', [
            'products' => $products,
            'shop' => [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
            ],
            'stockImages' => $stockImages,
            'categories' => $categories,
            'subCategories' => $subCategories,
        ]);
    }

    /**
     * Store a new product.
     */
    public function productsStore(Request $request)
    {
        $shop = $this->getVendorShop();

        if (!$shop) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Shop.']);
        }

        $request->validate([
            'item_name' => 'required|string|max:150',
            'item_description' => 'nullable|string',
            'item_price' => 'required|numeric|min:0',
            'item_quantity' => 'required|integer|min:0',
            'weight' => 'nullable|numeric|min:0',
            'metric' => 'nullable|string|max:50',
            'category' => 'nullable|exists:category,id',
            'sub_category_id' => 'nullable|exists:sub_categories,id',
            'item_images' => 'nullable|array',
            'item_images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'stock_image_urls' => 'nullable|array',
            'stock_image_urls.*' => 'nullable|string',
            'item_status' => 'nullable|string|in:active,inactive',
        ]);

        // Validate that at least one image source is provided
        $hasUploadedImages = $request->hasFile('item_images') && count($request->file('item_images')) > 0;
        $hasStockImages = $request->has('stock_image_urls') && is_array($request->stock_image_urls) && count($request->stock_image_urls) > 0;
        
        if (!$hasUploadedImages && !$hasStockImages) {
            return redirect()->back()
                ->withErrors(['item_images' => 'At least one product image is required.'])
                ->withInput();
        }

        // Handle file uploads and stock images
        $imagePaths = [];
        
        // Add uploaded images
        if ($request->hasFile('item_images')) {
            foreach ($request->file('item_images') as $image) {
                $path = $image->store('products', 'public');
                $imagePaths[] = '/storage/' . $path;
            }
        }
        
        // Add stock image URLs
        if ($request->has('stock_image_urls') && is_array($request->stock_image_urls)) {
            foreach ($request->stock_image_urls as $stockImageUrl) {
                if (!empty($stockImageUrl)) {
                    $imagePaths[] = $stockImageUrl;
                }
            }
        }

        $insertData = [
            'shop_id' => $shop->id,
            'item_name' => $request->item_name,
            'item_description' => $request->item_description,
            'item_price' => $request->item_price,
            'item_quantity' => $request->item_quantity,
            'weight' => $request->weight,
            'metric' => $request->metric,
            'category' => $request->category,
            'sub_category_id' => $request->sub_category_id,
            'item_images' => !empty($imagePaths) ? json_encode($imagePaths) : null,
            'item_status' => $request->item_status ?? 'active',
            'average_rating' => 0.00,
            'total_reviews' => 0,
            'sold_count' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $itemId = DB::table('items')->insertGetId($insertData);
        $item = Item::find($itemId);

        ActivityLog::log('created', "Product created: {$request->item_name}", $item, null, $item->toArray());

        return redirect()->route('dashboard.vendor.products.index')
            ->with('success', 'Product created successfully.');
    }

    /**
     * Update a product.
     */
    public function productsUpdate(Request $request, $id)
    {
        $shop = $this->getVendorShop();

        if (!$shop) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Shop.']);
        }

        $product = DB::table('items')
            ->where('id', $id)
            ->where('shop_id', $shop->id)
            ->first();

        if (!$product) {
            return redirect()->back()
                ->withErrors(['error' => 'Product not found.']);
        }

        $oldProductValues = (array) $product;

        $request->validate([
            'item_name' => 'required|string|max:150',
            'item_description' => 'nullable|string',
            'item_price' => 'required|numeric|min:0',
            'item_quantity' => 'required|integer|min:0',
            'weight' => 'nullable|numeric|min:0',
            'metric' => 'nullable|string|max:50',
            'category' => 'nullable|exists:category,id',
            'sub_category_id' => 'nullable|exists:sub_categories,id',
            'item_images' => 'nullable|array',
            'item_images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'existing_images' => 'nullable|array',
            'existing_images.*' => 'nullable|string',
            'stock_image_urls' => 'nullable|array',
            'stock_image_urls.*' => 'nullable|string',
            'item_status' => 'nullable|string|in:active,inactive',
        ]);

        $updateData = [
            'item_name' => $request->item_name,
            'item_description' => $request->item_description,
            'item_price' => $request->item_price,
            'item_quantity' => $request->item_quantity,
            'weight' => $request->weight,
            'metric' => $request->metric,
            'category' => $request->category,
            'sub_category_id' => $request->sub_category_id,
            'item_status' => $request->item_status ?? $product->item_status,
            'updated_at' => now(),
        ];

        // Get current images from database
        $oldImages = $product->item_images ? json_decode($product->item_images, true) : [];
        $oldImages = is_array($oldImages) ? $oldImages : [];
        
        // Get existing images that should be kept (from frontend)
        $existingImages = $request->input('existing_images', []);
        $existingImages = is_array($existingImages) ? $existingImages : [];
        
        // Collect all final images (existing + new)
        $finalImages = [];
        
        // Add existing images that should be kept
        foreach ($existingImages as $existingImage) {
            if (!empty($existingImage)) {
                $finalImages[] = $existingImage;
            }
        }
        
        // Handle new file uploads
        if ($request->hasFile('item_images')) {
            foreach ($request->file('item_images') as $image) {
                $path = $image->store('products', 'public');
                $finalImages[] = '/storage/' . $path;
            }
        }
        
        // Handle stock image URLs
        if ($request->has('stock_image_urls') && is_array($request->stock_image_urls)) {
            foreach ($request->stock_image_urls as $stockImageUrl) {
                if (!empty($stockImageUrl) && !in_array($stockImageUrl, $finalImages)) {
                    $finalImages[] = $stockImageUrl;
                }
            }
        }
        
        // Delete old images that are not in the final list
        foreach ($oldImages as $oldImage) {
            if (!in_array($oldImage, $finalImages)) {
                $oldPath = str_replace('/storage/', '', parse_url($oldImage, PHP_URL_PATH));
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }
        }
        
        // Update images in database
        $updateData['item_images'] = !empty($finalImages) ? json_encode($finalImages) : null;

        DB::table('items')
            ->where('id', $id)
            ->update($updateData);

        $item = Item::find($id);
        ActivityLog::log('updated', "Product updated: {$item->item_name}", $item, $oldProductValues, $item->toArray());

        return redirect()->route('dashboard.vendor.products.index')
            ->with('success', 'Product updated successfully.');
    }

    /**
     * Delete a product.
     */
    public function productsDestroy($id)
    {
        $shop = $this->getVendorShop();

        if (!$shop) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Shop.']);
        }

        $product = DB::table('items')
            ->where('id', $id)
            ->where('shop_id', $shop->id)
            ->first();

        if (!$product) {
            return redirect()->back()
                ->withErrors(['error' => 'Product not found.']);
        }

        ActivityLog::log('deleted', "Product deleted: {$product->item_name} (ID: {$id})", null, (array) $product, null);

        DB::table('items')
            ->where('id', $id)
            ->delete();

        return redirect()->route('dashboard.vendor.products.index')
            ->with('success', 'Product deleted successfully.');
    }

    /**
     * Display inventory management page.
     */
    public function inventoryIndex()
    {
        $shop = $this->getVendorShop();

        if (!$shop) {
            return redirect()->route('dashboard.vendor')
                ->with('error', 'You are not associated with any Shop.');
        }

        $inventory = DB::table('items')
            ->where('shop_id', $shop->id)
            ->select('id', 'item_name', 'item_quantity', 'item_price', 'category', 'item_status', 'sold_count')
            ->orderBy('item_name', 'asc')
            ->get();

        return Inertia::render('Dashboard/Vendor/Inventory', [
            'inventory' => $inventory,
            'shop' => [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
            ],
        ]);
    }

    /**
     * Update inventory quantity.
     */
    public function inventoryUpdate(Request $request, $id)
    {
        $shop = $this->getVendorShop();

        if (!$shop) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Shop.']);
        }

        $product = DB::table('items')
            ->where('id', $id)
            ->where('shop_id', $shop->id)
            ->first();

        if (!$product) {
            return redirect()->back()
                ->withErrors(['error' => 'Product not found.']);
        }

        $request->validate([
            'item_quantity' => 'required|integer|min:0',
        ]);

        DB::table('items')
            ->where('id', $id)
            ->update([
                'item_quantity' => $request->item_quantity,
                'updated_at' => now(),
            ]);

        return redirect()->route('dashboard.vendor.inventory.index')
            ->with('success', 'Inventory updated successfully.');
    }

    /**
     * Display orders listing (orders table only; one row per order).
     */
    public function ordersIndex()
    {
        $shop = $this->getVendorShop();

        if (!$shop) {
            return redirect()->route('dashboard.vendor')
                ->with('error', 'You are not associated with any Shop.');
        }

        // Get distinct orders that have at least one order_item from this shop (one row per order)
        $orders = DB::table('orders')
            ->join('order_items', 'orders.id', '=', 'order_items.order_id')
            ->join('items', 'order_items.item_id', '=', 'items.id')
            ->join('users', 'orders.user_id', '=', 'users.id')
            ->join('user_details', 'users.user_detail_id', '=', 'user_details.id')
            ->leftJoin('order_status', 'orders.order_status', '=', 'order_status.id')
            ->where('items.shop_id', $shop->id)
            ->select(
                'orders.id',
                'orders.order_status',
                'order_status.stat_description as order_status_description',
                'orders.ordered_at',
                'user_details.first_name',
                'user_details.last_name',
                'user_details.email'
            )
            ->groupBy('orders.id', 'orders.order_status', 'order_status.stat_description', 'orders.ordered_at', 'user_details.first_name', 'user_details.last_name', 'user_details.email')
            ->orderBy('orders.ordered_at', 'desc')
            ->get();

        $orders = $orders->map(function ($order) {
            return [
                'id' => $order->id,
                'order_status' => $order->order_status,
                'order_status_description' => $order->order_status_description ?? '—',
                'customer_name' => trim($order->first_name . ' ' . $order->last_name),
                'customer_email' => $order->email,
                'ordered_at' => $order->ordered_at,
            ];
        });

        return Inertia::render('Dashboard/Vendor/Orders', [
            'orders' => $orders,
            'shop' => [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
            ],
        ]);
    }

    /**
     * Display order items for a specific order.
     */
    public function orderItemsIndex($orderId)
    {
        $shop = $this->getVendorShop();

        if (!$shop) {
            return redirect()->route('dashboard.vendor')
                ->with('error', 'You are not associated with any Shop.');
        }

        // Verify the order has at least one item from this shop
        $order = DB::table('orders')
            ->join('users', 'orders.user_id', '=', 'users.id')
            ->join('user_details', 'users.user_detail_id', '=', 'user_details.id')
            ->where('orders.id', $orderId)
            ->select(
                'orders.id',
                'orders.order_status',
                'orders.ordered_at',
                'user_details.first_name',
                'user_details.last_name',
                'user_details.email'
            )
            ->first();

        if (!$order) {
            return redirect()->route('dashboard.vendor.orders.index')
                ->with('error', 'Order not found.');
        }

        $orderItems = DB::table('order_items')
            ->join('items', 'order_items.item_id', '=', 'items.id')
            ->where('order_items.order_id', $orderId)
            ->where('items.shop_id', $shop->id)
            ->select(
                'order_items.id',
                'order_items.order_id',
                'order_items.item_id',
                'order_items.quantity',
                'order_items.price_at_purchase',
                'order_items.item_status',
                'order_items.created_at',
                'items.item_name'
            )
            ->orderBy('order_items.created_at', 'asc')
            ->get();

        $orderItems = $orderItems->map(function ($item) {
            return [
                'id' => $item->id,
                'order_id' => $item->order_id,
                'item_id' => $item->item_id,
                'item_name' => $item->item_name,
                'quantity' => $item->quantity,
                'price_at_purchase' => $item->price_at_purchase,
                'total' => $item->quantity * $item->price_at_purchase,
                'item_status' => $item->item_status,
                'created_at' => $item->created_at,
            ];
        });

        $orderItemStatuses = DB::table('order_item_status')
            ->where('is_active', true)
            ->orderBy('id')
            ->get(['id', 'stat_description'])
            ->map(fn ($row) => ['id' => (int) $row->id, 'stat_description' => $row->stat_description])
            ->values()
            ->all();

        return Inertia::render('Dashboard/Vendor/OrderItems', [
            'order' => [
                'id' => $order->id,
                'order_status' => $order->order_status,
                'ordered_at' => $order->ordered_at,
                'customer_name' => trim($order->first_name . ' ' . $order->last_name),
                'customer_email' => $order->email,
            ],
            'orderItems' => $orderItems,
            'orderItemStatuses' => $orderItemStatuses,
        ]);
    }

    /**
     * Update order status.
     */
    public function ordersUpdate(Request $request, $id)
    {
        $shop = $this->getVendorShop();

        if (!$shop) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Shop.']);
        }

        // Verify the order item belongs to this shop's products
        $orderItem = DB::table('order_items')
            ->join('items', 'order_items.item_id', '=', 'items.id')
            ->where('order_items.id', $id)
            ->where('items.shop_id', $shop->id)
            ->select('order_items.*')
            ->first();

        if (!$orderItem) {
            return redirect()->back()
                ->withErrors(['error' => 'Order not found.']);
        }

        $validStatusIds = DB::table('order_item_status')->where('is_active', true)->pluck('id')->map(fn ($id) => (int) $id)->all();
        $request->validate([
            'item_status' => ['required', 'integer', Rule::in($validStatusIds)],
        ]);

        $newItemStatus = (int) $request->item_status;
        DB::table('order_items')
            ->where('id', $id)
            ->update([
                'item_status' => $newItemStatus,
                'updated_at' => now(),
            ]);

        // If we just moved this item from Pending to something else, check if it was the last Pending item for this order
        $pendingOrderItemStatusId = DB::table('order_item_status')
            ->where('stat_description', 'Pending')
            ->value('id');
        if ($pendingOrderItemStatusId !== null && (int) $orderItem->item_status === (int) $pendingOrderItemStatusId) {
            $remainingPendingCount = DB::table('order_items')
                ->where('order_id', $orderItem->order_id)
                ->where('item_status', (int) $pendingOrderItemStatusId)
                ->count();
            if ($remainingPendingCount === 0) {
                $preparingOrderStatusId = DB::table('order_status')
                    ->where('stat_description', 'Preparing')
                    ->value('id');
                if ($preparingOrderStatusId !== null) {
                    DB::table('orders')
                        ->where('id', $orderItem->order_id)
                        ->update([
                            'order_status' => (int) $preparingOrderStatusId,
                            'updated_at' => now(),
                        ]);
                }
            }
        }

        $returnOrderId = $request->input('return_to_order_id');
        if ($returnOrderId && (int) $returnOrderId === (int) $orderItem->order_id) {
            return redirect()->route('dashboard.vendor.orders.items.index', ['orderId' => $orderItem->order_id])
                ->with('success', 'Order item status updated successfully.');
        }

        return redirect()->route('dashboard.vendor.orders.index')
            ->with('success', 'Order status updated successfully.');
    }

    /**
     * Display payouts listing.
     */
    public function payoutsIndex()
    {
        $shop = $this->getVendorShop();

        if (!$shop) {
            return redirect()->route('dashboard.vendor')
                ->with('error', 'You are not associated with any Shop.');
        }

        // Get completed orders through items that belong to this shop
        $completedOrders = DB::table('order_items')
            ->join('items', 'order_items.item_id', '=', 'items.id')
            ->where('items.shop_id', $shop->id)
            ->where('order_items.item_status', 'delivered')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->select(
                'order_items.id',
                'order_items.order_id',
                'order_items.quantity',
                'order_items.price_at_purchase',
                'order_items.created_at',
                'orders.ordered_at'
            )
            ->orderBy('order_items.created_at', 'desc')
            ->get();

        $completedOrders = $completedOrders->map(function ($order) {
            return [
                'id' => $order->id,
                'order_id' => $order->order_id,
                'quantity' => $order->quantity,
                'price_at_purchase' => $order->price_at_purchase,
                'total' => $order->quantity * $order->price_at_purchase,
                'ordered_at' => $order->ordered_at,
                'created_at' => $order->created_at,
            ];
        });

        // Calculate totals
        $totalRevenue = $completedOrders->sum('total');
        $totalOrders = $completedOrders->count();

        return Inertia::render('Dashboard/Vendor/Payouts', [
            'payouts' => $completedOrders,
            'totalRevenue' => $totalRevenue,
            'totalOrders' => $totalOrders,
            'shop' => [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
            ],
        ]);
    }

    /**
     * Display promotions listing.
     */
    public function promotionsIndex()
    {
        $shop = $this->getVendorShopWithAgrivet();

        if (!$shop) {
            return redirect()->route('dashboard.vendor')
                ->with('error', 'You are not associated with any Shop.');
        }

        $agrivet = $shop->agrivet;

        // Get promotions for this shop's agrivet (promotions are shared at agrivet level)
        $promotions = $agrivet ? DB::table('promotions')
            ->where('agrivet_id', $agrivet->id)
            ->orderBy('created_at', 'desc')
            ->get() : collect([]);

        // Get products for this shop (for applicable items and bundles)
        $products = DB::table('items')
            ->where('shop_id', $shop->id)
            ->where('item_status', 'active')
            ->select('id', 'item_name', 'item_price')
            ->orderBy('item_name', 'asc')
            ->get();

        $promotions = $promotions->map(function ($promo) {
            return [
                'id' => $promo->id,
                'name' => $promo->name,
                'description' => $promo->description,
                'type' => $promo->type,
                'discount_value' => $promo->discount_value,
                'buy_quantity' => $promo->buy_quantity,
                'get_quantity' => $promo->get_quantity,
                'minimum_order_amount' => $promo->minimum_order_amount,
                'maximum_discount' => $promo->maximum_discount,
                'applicable_items' => $promo->applicable_items ? json_decode($promo->applicable_items, true) : [],
                'bundle_items' => $promo->bundle_items ? json_decode($promo->bundle_items, true) : [],
                'bundle_price' => $promo->bundle_price,
                'start_date' => $promo->start_date,
                'end_date' => $promo->end_date,
                'usage_limit' => $promo->usage_limit,
                'usage_count' => $promo->usage_count,
                'per_customer_limit' => $promo->per_customer_limit,
                'promo_code' => $promo->promo_code,
                'status' => $promo->status,
                'created_at' => $promo->created_at,
                'updated_at' => $promo->updated_at,
            ];
        });

        return Inertia::render('Dashboard/Vendor/Promotions', [
            'promotions' => $promotions,
            'products' => $products,
            'promotionTypes' => Promotion::getTypes(),
            'shop' => [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
            ],
            'agrivet' => $agrivet ? [
                'id' => $agrivet->id,
                'name' => $agrivet->name,
            ] : null,
        ]);
    }

    /**
     * Store a new promotion.
     */
    public function promotionsStore(Request $request)
    {
        $shop = $this->getVendorShopWithAgrivet();

        if (!$shop) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Shop.']);
        }

        $agrivet = $shop->agrivet;

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'Your shop is not associated with any Agrivet.']);
        }

        $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'type' => 'required|string|in:percentage_off,fixed_amount_off,buy_x_get_y,bundle,free_shipping',
            'discount_value' => 'nullable|numeric|min:0',
            'buy_quantity' => 'nullable|integer|min:1',
            'get_quantity' => 'nullable|integer|min:1',
            'minimum_order_amount' => 'nullable|numeric|min:0',
            'maximum_discount' => 'nullable|numeric|min:0',
            'applicable_items' => 'nullable|array',
            'bundle_items' => 'nullable|array',
            'bundle_price' => 'nullable|numeric|min:0',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'usage_limit' => 'nullable|integer|min:1',
            'per_customer_limit' => 'nullable|integer|min:1',
            'promo_code' => 'nullable|string|max:50|unique:promotions,promo_code',
            'status' => 'nullable|string|in:active,inactive,scheduled',
        ]);

        // Determine status based on dates if not provided
        $status = $request->status;
        if (!$status) {
            $now = now();
            $startDate = \Carbon\Carbon::parse($request->start_date);
            if ($startDate->isFuture()) {
                $status = 'scheduled';
            } else {
                $status = 'active';
            }
        }

        DB::table('promotions')->insert([
            'agrivet_id' => $agrivet->id,
            'name' => $request->name,
            'description' => $request->description,
            'type' => $request->type,
            'discount_value' => $request->discount_value,
            'buy_quantity' => $request->buy_quantity,
            'get_quantity' => $request->get_quantity,
            'minimum_order_amount' => $request->minimum_order_amount,
            'maximum_discount' => $request->maximum_discount,
            'applicable_items' => $request->applicable_items ? json_encode($request->applicable_items) : null,
            'bundle_items' => $request->bundle_items ? json_encode($request->bundle_items) : null,
            'bundle_price' => $request->bundle_price,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'usage_limit' => $request->usage_limit,
            'usage_count' => 0,
            'per_customer_limit' => $request->per_customer_limit,
            'promo_code' => $request->promo_code,
            'status' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect()->route('dashboard.vendor.promotions.index')
            ->with('success', 'Promotion created successfully.');
    }

    /**
     * Update a promotion.
     */
    public function promotionsUpdate(Request $request, $id)
    {
        $shop = $this->getVendorShopWithAgrivet();

        if (!$shop) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Shop.']);
        }

        $agrivet = $shop->agrivet;

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'Your shop is not associated with any Agrivet.']);
        }

        $promotion = DB::table('promotions')
            ->where('id', $id)
            ->where('agrivet_id', $agrivet->id)
            ->first();

        if (!$promotion) {
            return redirect()->back()
                ->withErrors(['error' => 'Promotion not found.']);
        }

        $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'type' => 'required|string|in:percentage_off,fixed_amount_off,buy_x_get_y,bundle,free_shipping',
            'discount_value' => 'nullable|numeric|min:0',
            'buy_quantity' => 'nullable|integer|min:1',
            'get_quantity' => 'nullable|integer|min:1',
            'minimum_order_amount' => 'nullable|numeric|min:0',
            'maximum_discount' => 'nullable|numeric|min:0',
            'applicable_items' => 'nullable|array',
            'bundle_items' => 'nullable|array',
            'bundle_price' => 'nullable|numeric|min:0',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'usage_limit' => 'nullable|integer|min:1',
            'per_customer_limit' => 'nullable|integer|min:1',
            'promo_code' => 'nullable|string|max:50|unique:promotions,promo_code,' . $id,
            'status' => 'nullable|string|in:active,inactive,scheduled,expired',
        ]);

        DB::table('promotions')
            ->where('id', $id)
            ->update([
                'name' => $request->name,
                'description' => $request->description,
                'type' => $request->type,
                'discount_value' => $request->discount_value,
                'buy_quantity' => $request->buy_quantity,
                'get_quantity' => $request->get_quantity,
                'minimum_order_amount' => $request->minimum_order_amount,
                'maximum_discount' => $request->maximum_discount,
                'applicable_items' => $request->applicable_items ? json_encode($request->applicable_items) : null,
                'bundle_items' => $request->bundle_items ? json_encode($request->bundle_items) : null,
                'bundle_price' => $request->bundle_price,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'usage_limit' => $request->usage_limit,
                'per_customer_limit' => $request->per_customer_limit,
                'promo_code' => $request->promo_code,
                'status' => $request->status ?? $promotion->status,
                'updated_at' => now(),
            ]);

        return redirect()->route('dashboard.vendor.promotions.index')
            ->with('success', 'Promotion updated successfully.');
    }

    /**
     * Delete a promotion.
     */
    public function promotionsDestroy($id)
    {
        $shop = $this->getVendorShopWithAgrivet();

        if (!$shop) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Shop.']);
        }

        $agrivet = $shop->agrivet;

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'Your shop is not associated with any Agrivet.']);
        }

        $promotion = DB::table('promotions')
            ->where('id', $id)
            ->where('agrivet_id', $agrivet->id)
            ->first();

        if (!$promotion) {
            return redirect()->back()
                ->withErrors(['error' => 'Promotion not found.']);
        }

        DB::table('promotions')
            ->where('id', $id)
            ->delete();

        return redirect()->route('dashboard.vendor.promotions.index')
            ->with('success', 'Promotion deleted successfully.');
    }
}
