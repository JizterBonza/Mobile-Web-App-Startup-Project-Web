<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Agrivet;

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
            return [
                'id' => $item->id,
                'item_name' => $item->item_name,
                'item_description' => $item->item_description,
                'item_price' => $item->item_price,
                'item_quantity' => $item->item_quantity,
                'category' => $item->category,
                'item_images' => $item->item_images ? json_decode($item->item_images, true) : [],
                'item_status' => $item->item_status,
                'average_rating' => $item->average_rating,
                'total_reviews' => $item->total_reviews,
                'sold_count' => $item->sold_count,
                'created_at' => $item->created_at,
                'updated_at' => $item->updated_at,
            ];
        });

        return Inertia::render('Dashboard/Vendor/Products', [
            'products' => $products,
            'store' => ['id' => $agrivet->id],
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
            'item_status' => 'nullable|string|in:active,inactive',
        ]);

        $hasAgrivetId = DB::getSchemaBuilder()->hasColumn('items', 'agrivet_id');
        
        $insertData = [
            'item_name' => $request->item_name,
            'item_description' => $request->item_description,
            'item_price' => $request->item_price,
            'item_quantity' => $request->item_quantity,
            'category' => $request->category,
            'item_images' => $request->item_images ? json_encode($request->item_images) : null,
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
            'item_status' => 'nullable|string|in:active,inactive',
        ]);

        DB::table('items')
            ->where('id', $id)
            ->update([
                'item_name' => $request->item_name,
                'item_description' => $request->item_description,
                'item_price' => $request->item_price,
                'item_quantity' => $request->item_quantity,
                'category' => $request->category,
                'item_images' => $request->item_images ? json_encode($request->item_images) : null,
                'item_status' => $request->item_status ?? $product->item_status,
                'updated_at' => now(),
            ]);

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
}
