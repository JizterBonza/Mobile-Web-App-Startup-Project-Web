<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Agrivet;
use App\Models\Promotion;
use App\Models\ProductImage;

class VendorController extends Controller
{
    /**
     * Get the vendor's Agrivet.
     */
    private function getVendorAgrivet()
    {
        $vendor = auth()->user();
        $vendor->load('agrivets');
        
        if ($vendor->agrivets->isEmpty()) {
            return null;
        }
        
        // Get the first active agrivet (vendors typically have one)
        return $vendor->agrivets->first();
    }

    /**
     * Display store management page.
     */
    public function storeIndex()
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->route('dashboard.vendor')
                ->with('error', 'You are not associated with any Agrivet. Please contact an administrator.');
        }

        return Inertia::render('Dashboard/Vendor/StoreManagement', [
            'store' => [
                'id' => $agrivet->id,
                'shop_name' => $agrivet->name,
                'shop_description' => $agrivet->description,
                'shop_address' => $agrivet->address,
                'shop_lat' => $agrivet->latitude,
                'shop_long' => $agrivet->longitude,
                'contact_number' => $agrivet->contact_number,
                'logo_url' => $agrivet->logo_url,
                'shop_status' => $agrivet->status,
                'email' => $agrivet->email,
                'created_at' => $agrivet->created_at,
                'updated_at' => $agrivet->updated_at,
            ],
        ]);
    }

    /**
     * Store or update store information.
     */
    public function storeUpdate(Request $request)
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Agrivet.']);
        }

        $request->validate([
            'shop_name' => 'required|string|max:150',
            'shop_description' => 'nullable|string',
            'shop_address' => 'nullable|string|max:255',
            'shop_lat' => 'nullable|numeric',
            'shop_long' => 'nullable|numeric',
            'contact_number' => 'nullable|string|max:20',
            'logo_url' => 'nullable|string|max:255',
            'shop_status' => 'nullable|string|in:active,inactive',
            'email' => 'nullable|string|email|max:255',
        ]);

        $agrivet->update([
            'name' => $request->shop_name,
            'description' => $request->shop_description,
            'address' => $request->shop_address,
            'latitude' => $request->shop_lat,
            'longitude' => $request->shop_long,
            'contact_number' => $request->contact_number,
            'logo_url' => $request->logo_url,
            'status' => $request->shop_status ?? 'active',
            'email' => $request->email ?? $agrivet->email,
        ]);

        return redirect()->route('dashboard.vendor.store.index')
            ->with('success', 'Store updated successfully.');
    }

    /**
     * Display products listing.
     */
    public function productsIndex()
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->route('dashboard.vendor')
                ->with('error', 'You are not associated with any Agrivet.');
        }

        // Get products for this agrivet
        // Note: If items table uses shop_id, we need to get shop_id from agrivet
        // For now, assuming items will have agrivet_id or we'll use a mapping
        // Check if items table has agrivet_id column
        $hasAgrivetId = DB::getSchemaBuilder()->hasColumn('items', 'agrivet_id');
        
        if ($hasAgrivetId) {
            $products = DB::table('items')
                ->where('agrivet_id', $agrivet->id)
                ->orderBy('created_at', 'desc')
                ->get();
        } else {
            // Fallback: use shop_id if agrivet_id doesn't exist
            // Get shop for this agrivet (check if shops table has agrivet_id)
            $hasShopAgrivetId = DB::getSchemaBuilder()->hasColumn('shops', 'agrivet_id');
            
            if ($hasShopAgrivetId) {
                $shop = DB::table('shops')
                    ->where('agrivet_id', $agrivet->id)
                    ->first();
            } else {
                // If shops doesn't have agrivet_id, find shop by vendor's user_id
                $vendor = auth()->user();
                $shop = DB::table('shops')
                    ->where('user_id', $vendor->id)
                    ->first();
            }
            
            if (!$shop) {
                // Create a shop record for this agrivet/vendor
                $vendor = auth()->user();
                $shopData = [
                    'user_id' => $vendor->id,
                    'shop_name' => $agrivet->name,
                    'shop_status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                
                if ($hasShopAgrivetId) {
                    $shopData['agrivet_id'] = $agrivet->id;
                }
                
                $shopId = DB::table('shops')->insertGetId($shopData);
                $shop = (object)['id' => $shopId];
            }
            
            $products = DB::table('items')
                ->where('shop_id', $shop->id)
                ->orderBy('created_at', 'desc')
                ->get();
        }

        $products = $products->map(function ($item) {
            // Normalize image URLs to ensure they're properly formatted
            $images = $item->item_images ? json_decode($item->item_images, true) : [];
            if (!empty($images)) {
                $images = array_map(function ($image) {
                    // If URL doesn't start with /storage/, ensure it does
                    if (is_string($image)) {
                        // Check if it's already a full URL (http/https)
                        if (preg_match('/^https?:\/\//', $image)) {
                            return $image;
                        }
                        // Check if it starts with /storage/
                        if (strpos($image, '/storage/') === 0) {
                            return $image;
                        }
                        // If it contains products/, prepend /storage/
                        if (strpos($image, 'products/') !== false) {
                            return '/storage/' . $image;
                        }
                        // Otherwise, assume it's a filename and prepend full path
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
                'category' => $item->category,
                'item_images' => $images,
                'item_status' => $item->item_status,
                'average_rating' => $item->average_rating,
                'total_reviews' => $item->total_reviews,
                'sold_count' => $item->sold_count,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
            ];
        });

        // Get stock images for this agrivet
        $stockImages = ProductImage::where('agrivet_id', $agrivet->id)
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
            });

        return Inertia::render('Dashboard/Vendor/Products', [
            'products' => $products,
            'store' => ['id' => $agrivet->id],
            'stockImages' => $stockImages,
        ]);
    }

    /**
     * Store a new product.
     */
    public function productsStore(Request $request)
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Agrivet.']);
        }

        $request->validate([
            'item_name' => 'required|string|max:150',
            'item_description' => 'nullable|string',
            'item_price' => 'required|numeric|min:0',
            'item_quantity' => 'required|integer|min:0',
            'category' => 'nullable|string|max:100',
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
                // Generate URL: /storage/products/filename.jpg
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

        $hasAgrivetId = DB::getSchemaBuilder()->hasColumn('items', 'agrivet_id');
        
        $insertData = [
            'item_name' => $request->item_name,
            'item_description' => $request->item_description,
            'item_price' => $request->item_price,
            'item_quantity' => $request->item_quantity,
            'category' => $request->category,
            'item_images' => !empty($imagePaths) ? json_encode($imagePaths) : null,
            'item_status' => $request->item_status ?? 'active',
            'average_rating' => 0.00,
            'total_reviews' => 0,
            'sold_count' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if ($hasAgrivetId) {
            $insertData['agrivet_id'] = $agrivet->id;
        } else {
            // Get or create shop for this agrivet
            $hasShopAgrivetId = DB::getSchemaBuilder()->hasColumn('shops', 'agrivet_id');
            
            if ($hasShopAgrivetId) {
                $shop = DB::table('shops')
                    ->where('agrivet_id', $agrivet->id)
                    ->first();
            } else {
                $vendor = auth()->user();
                $shop = DB::table('shops')
                    ->where('user_id', $vendor->id)
                    ->first();
            }
            
            if (!$shop) {
                $vendor = auth()->user();
                $shopData = [
                    'user_id' => $vendor->id,
                    'shop_name' => $agrivet->name,
                    'shop_status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                
                if ($hasShopAgrivetId) {
                    $shopData['agrivet_id'] = $agrivet->id;
                }
                
                $shopId = DB::table('shops')->insertGetId($shopData);
            } else {
                $shopId = $shop->id;
            }
            
            $insertData['shop_id'] = $shopId;
        }

        DB::table('items')->insert($insertData);

        return redirect()->route('dashboard.vendor.products.index')
            ->with('success', 'Product created successfully.');
    }

    /**
     * Update a product.
     */
    public function productsUpdate(Request $request, $id)
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Agrivet.']);
        }

        $hasAgrivetId = DB::getSchemaBuilder()->hasColumn('items', 'agrivet_id');
        
        if ($hasAgrivetId) {
            $product = DB::table('items')
                ->where('id', $id)
                ->where('agrivet_id', $agrivet->id)
                ->first();
        } else {
            $hasShopAgrivetId = DB::getSchemaBuilder()->hasColumn('shops', 'agrivet_id');
            
            if ($hasShopAgrivetId) {
                $shop = DB::table('shops')
                    ->where('agrivet_id', $agrivet->id)
                    ->first();
            } else {
                $vendor = auth()->user();
                $shop = DB::table('shops')
                    ->where('user_id', $vendor->id)
                    ->first();
            }
            
            if (!$shop) {
                return redirect()->back()
                    ->withErrors(['error' => 'Store not found.']);
            }
            
            $product = DB::table('items')
                ->where('id', $id)
                ->where('shop_id', $shop->id)
                ->first();
        }

        if (!$product) {
            return redirect()->back()
                ->withErrors(['error' => 'Product not found.']);
        }

        $request->validate([
            'item_name' => 'required|string|max:150',
            'item_description' => 'nullable|string',
            'item_price' => 'required|numeric|min:0',
            'item_quantity' => 'required|integer|min:0',
            'category' => 'nullable|string|max:100',
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
            'category' => $request->category,
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
            // Upload new images
            foreach ($request->file('item_images') as $image) {
                $path = $image->store('products', 'public');
                // Generate URL: /storage/products/filename.jpg
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

        return redirect()->route('dashboard.vendor.products.index')
            ->with('success', 'Product updated successfully.');
    }

    /**
     * Delete a product.
     */
    public function productsDestroy($id)
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Agrivet.']);
        }

        $hasAgrivetId = DB::getSchemaBuilder()->hasColumn('items', 'agrivet_id');
        
        if ($hasAgrivetId) {
            $product = DB::table('items')
                ->where('id', $id)
                ->where('agrivet_id', $agrivet->id)
                ->first();
        } else {
            $hasShopAgrivetId = DB::getSchemaBuilder()->hasColumn('shops', 'agrivet_id');
            
            if ($hasShopAgrivetId) {
                $shop = DB::table('shops')
                    ->where('agrivet_id', $agrivet->id)
                    ->first();
            } else {
                $vendor = auth()->user();
                $shop = DB::table('shops')
                    ->where('user_id', $vendor->id)
                    ->first();
            }
            
            if (!$shop) {
                return redirect()->back()
                    ->withErrors(['error' => 'Store not found.']);
            }
            
            $product = DB::table('items')
                ->where('id', $id)
                ->where('shop_id', $shop->id)
                ->first();
        }

        if (!$product) {
            return redirect()->back()
                ->withErrors(['error' => 'Product not found.']);
        }

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
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->route('dashboard.vendor')
                ->with('error', 'You are not associated with any Agrivet.');
        }

        $hasAgrivetId = DB::getSchemaBuilder()->hasColumn('items', 'agrivet_id');
        
        if ($hasAgrivetId) {
            $inventory = DB::table('items')
                ->where('agrivet_id', $agrivet->id)
                ->select('id', 'item_name', 'item_quantity', 'item_price', 'category', 'item_status', 'sold_count')
                ->orderBy('item_name', 'asc')
                ->get();
        } else {
            $hasShopAgrivetId = DB::getSchemaBuilder()->hasColumn('shops', 'agrivet_id');
            
            if ($hasShopAgrivetId) {
                $shop = DB::table('shops')
                    ->where('agrivet_id', $agrivet->id)
                    ->first();
            } else {
                $vendor = auth()->user();
                $shop = DB::table('shops')
                    ->where('user_id', $vendor->id)
                    ->first();
            }
            
            if (!$shop) {
                $inventory = collect([]);
            } else {
                $inventory = DB::table('items')
                    ->where('shop_id', $shop->id)
                    ->select('id', 'item_name', 'item_quantity', 'item_price', 'category', 'item_status', 'sold_count')
                    ->orderBy('item_name', 'asc')
                    ->get();
            }
        }

        return Inertia::render('Dashboard/Vendor/Inventory', [
            'inventory' => $inventory,
            'store' => ['id' => $agrivet->id],
        ]);
    }

    /**
     * Update inventory quantity.
     */
    public function inventoryUpdate(Request $request, $id)
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Agrivet.']);
        }

        $hasAgrivetId = DB::getSchemaBuilder()->hasColumn('items', 'agrivet_id');
        
        if ($hasAgrivetId) {
            $product = DB::table('items')
                ->where('id', $id)
                ->where('agrivet_id', $agrivet->id)
                ->first();
        } else {
            $hasShopAgrivetId = DB::getSchemaBuilder()->hasColumn('shops', 'agrivet_id');
            
            if ($hasShopAgrivetId) {
                $shop = DB::table('shops')
                    ->where('agrivet_id', $agrivet->id)
                    ->first();
            } else {
                $vendor = auth()->user();
                $shop = DB::table('shops')
                    ->where('user_id', $vendor->id)
                    ->first();
            }
            
            if (!$shop) {
                return redirect()->back()
                    ->withErrors(['error' => 'Store not found.']);
            }
            
            $product = DB::table('items')
                ->where('id', $id)
                ->where('shop_id', $shop->id)
                ->first();
        }

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
     * Display orders listing.
     */
    public function ordersIndex()
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->route('dashboard.vendor')
                ->with('error', 'You are not associated with any Agrivet.');
        }

        $hasAgrivetId = DB::getSchemaBuilder()->hasColumn('items', 'agrivet_id');
        
        if ($hasAgrivetId) {
            // Join through items to get agrivet_id
            $orders = DB::table('order_items')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->join('items', 'order_items.item_id', '=', 'items.id')
                ->join('users', 'orders.user_id', '=', 'users.id')
                ->join('user_details', 'users.user_detail_id', '=', 'user_details.id')
                ->where('items.agrivet_id', $agrivet->id)
                ->select(
                    'order_items.id',
                    'order_items.order_id',
                    'order_items.item_id',
                    'order_items.quantity',
                    'order_items.price_at_purchase',
                    'order_items.item_status',
                    'order_items.created_at',
                    'orders.order_status',
                    'orders.ordered_at',
                    'items.item_name',
                    'user_details.first_name',
                    'user_details.last_name',
                    'user_details.email'
                )
                ->orderBy('order_items.created_at', 'desc')
                ->get();
        } else {
            $hasShopAgrivetId = DB::getSchemaBuilder()->hasColumn('shops', 'agrivet_id');
            
            if ($hasShopAgrivetId) {
                $shop = DB::table('shops')
                    ->where('agrivet_id', $agrivet->id)
                    ->first();
            } else {
                $vendor = auth()->user();
                $shop = DB::table('shops')
                    ->where('user_id', $vendor->id)
                    ->first();
            }
            
            if (!$shop) {
                $orders = collect([]);
            } else {
                $orders = DB::table('order_items')
                    ->join('orders', 'order_items.order_id', '=', 'orders.id')
                    ->join('items', 'order_items.item_id', '=', 'items.id')
                    ->join('users', 'orders.user_id', '=', 'users.id')
                    ->join('user_details', 'users.user_detail_id', '=', 'user_details.id')
                    ->where('order_items.shop_id', $shop->id)
                    ->select(
                        'order_items.id',
                        'order_items.order_id',
                        'order_items.item_id',
                        'order_items.quantity',
                        'order_items.price_at_purchase',
                        'order_items.item_status',
                        'order_items.created_at',
                        'orders.order_status',
                        'orders.ordered_at',
                        'items.item_name',
                        'user_details.first_name',
                        'user_details.last_name',
                        'user_details.email'
                    )
                    ->orderBy('order_items.created_at', 'desc')
                    ->get();
            }
        }

        $orders = $orders->map(function ($order) {
            return [
                'id' => $order->id,
                'order_id' => $order->order_id,
                'item_id' => $order->item_id,
                'item_name' => $order->item_name,
                'quantity' => $order->quantity,
                'price_at_purchase' => $order->price_at_purchase,
                'total' => $order->quantity * $order->price_at_purchase,
                'item_status' => $order->item_status,
                'order_status' => $order->order_status,
                'customer_name' => $order->first_name . ' ' . $order->last_name,
                'customer_email' => $order->email,
                'ordered_at' => $order->ordered_at,
                'created_at' => $order->created_at,
            ];
        });

        return Inertia::render('Dashboard/Vendor/Orders', [
            'orders' => $orders,
            'store' => ['id' => $agrivet->id],
        ]);
    }

    /**
     * Update order status.
     */
    public function ordersUpdate(Request $request, $id)
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Agrivet.']);
        }

        $hasAgrivetId = DB::getSchemaBuilder()->hasColumn('items', 'agrivet_id');
        
        if ($hasAgrivetId) {
            $orderItem = DB::table('order_items')
                ->join('items', 'order_items.item_id', '=', 'items.id')
                ->where('order_items.id', $id)
                ->where('items.agrivet_id', $agrivet->id)
                ->first();
        } else {
            $hasShopAgrivetId = DB::getSchemaBuilder()->hasColumn('shops', 'agrivet_id');
            
            if ($hasShopAgrivetId) {
                $shop = DB::table('shops')
                    ->where('agrivet_id', $agrivet->id)
                    ->first();
            } else {
                $vendor = auth()->user();
                $shop = DB::table('shops')
                    ->where('user_id', $vendor->id)
                    ->first();
            }
            
            if (!$shop) {
                return redirect()->back()
                    ->withErrors(['error' => 'Store not found.']);
            }
            
            $orderItem = DB::table('order_items')
                ->where('id', $id)
                ->where('shop_id', $shop->id)
                ->first();
        }

        if (!$orderItem) {
            return redirect()->back()
                ->withErrors(['error' => 'Order not found.']);
        }

        $request->validate([
            'item_status' => 'required|string|in:ordered,shipped,delivered,cancelled',
        ]);

        DB::table('order_items')
            ->where('id', $id)
            ->update([
                'item_status' => $request->item_status,
                'updated_at' => now(),
            ]);

        return redirect()->route('dashboard.vendor.orders.index')
            ->with('success', 'Order status updated successfully.');
    }

    /**
     * Display payouts listing.
     */
    public function payoutsIndex()
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->route('dashboard.vendor')
                ->with('error', 'You are not associated with any Agrivet.');
        }

        $hasAgrivetId = DB::getSchemaBuilder()->hasColumn('items', 'agrivet_id');
        
        if ($hasAgrivetId) {
            $completedOrders = DB::table('order_items')
                ->join('items', 'order_items.item_id', '=', 'items.id')
                ->where('items.agrivet_id', $agrivet->id)
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
        } else {
            $hasShopAgrivetId = DB::getSchemaBuilder()->hasColumn('shops', 'agrivet_id');
            
            if ($hasShopAgrivetId) {
                $shop = DB::table('shops')
                    ->where('agrivet_id', $agrivet->id)
                    ->first();
            } else {
                $vendor = auth()->user();
                $shop = DB::table('shops')
                    ->where('user_id', $vendor->id)
                    ->first();
            }
            
            if (!$shop) {
                $completedOrders = collect([]);
            } else {
                $completedOrders = DB::table('order_items')
                    ->where('order_items.shop_id', $shop->id)
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
            }
        }

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
            'store' => ['id' => $agrivet->id],
        ]);
    }

    /**
     * Display promotions listing.
     */
    public function promotionsIndex()
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->route('dashboard.vendor')
                ->with('error', 'You are not associated with any Agrivet.');
        }

        // Get promotions for this agrivet
        $promotions = DB::table('promotions')
            ->where('agrivet_id', $agrivet->id)
            ->orderBy('created_at', 'desc')
            ->get();

        // Get products for the dropdown (for applicable items and bundles)
        $hasAgrivetId = DB::getSchemaBuilder()->hasColumn('items', 'agrivet_id');
        
        if ($hasAgrivetId) {
            $products = DB::table('items')
                ->where('agrivet_id', $agrivet->id)
                ->where('item_status', 'active')
                ->select('id', 'item_name', 'item_price')
                ->orderBy('item_name', 'asc')
                ->get();
        } else {
            $hasShopAgrivetId = DB::getSchemaBuilder()->hasColumn('shops', 'agrivet_id');
            
            if ($hasShopAgrivetId) {
                $shop = DB::table('shops')
                    ->where('agrivet_id', $agrivet->id)
                    ->first();
            } else {
                $vendor = auth()->user();
                $shop = DB::table('shops')
                    ->where('user_id', $vendor->id)
                    ->first();
            }
            
            if (!$shop) {
                $products = collect([]);
            } else {
                $products = DB::table('items')
                    ->where('shop_id', $shop->id)
                    ->where('item_status', 'active')
                    ->select('id', 'item_name', 'item_price')
                    ->orderBy('item_name', 'asc')
                    ->get();
            }
        }

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
            'store' => ['id' => $agrivet->id],
        ]);
    }

    /**
     * Store a new promotion.
     */
    public function promotionsStore(Request $request)
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Agrivet.']);
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
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Agrivet.']);
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
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Agrivet.']);
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
