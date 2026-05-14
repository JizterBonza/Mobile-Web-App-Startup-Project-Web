<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\ActivityLog;
use App\Models\ProductCatalog;
use App\Models\Category;
use App\Models\SubCategory;

class SuperAdminProductController extends Controller
{
    /**
     * List all product catalog entries.
     */
    public function index()
    {
        $products = ProductCatalog::with('category', 'subCategory', 'creator')
            ->latest()
            ->get()
            ->map(fn($p) => [
                'id'                  => $p->id,
                'brand'               => $p->brand,
                'product_name'        => $p->product_name,
                'category_name'       => optional($p->category)->category_name,
                'sub_category_name'   => optional($p->subCategory)->sub_category_name,
                'weight'              => $p->weight,
                'unit'                => $p->unit,
                'images'              => $p->images ?? [],
                'primary_image_index' => $p->primary_image_index ?? 0,
                'status'              => $p->status,
                'created_by_name'     => optional($p->creator)->name,
                'created_at'          => $p->created_at,
            ]);

        return Inertia::render('Dashboard/SuperAdmin/Products', [
            'products' => $products,
        ]);
    }

    /**
     * Show the Register Product form for Super Admin.
     */
    public function create()
    {
        $categories = Category::where('status', 'active')
            ->orderBy('category_name')
            ->get()
            ->map(fn($c) => ['id' => $c->id, 'name' => $c->category_name]);

        $subCategories = SubCategory::where('sub_category_status', 'active')
            ->orderBy('sub_category_name')
            ->get()
            ->map(fn($s) => ['id' => $s->id, 'name' => $s->sub_category_name]);

        return Inertia::render('Dashboard/SuperAdmin/RegisterProduct', [
            'categories'    => $categories,
            'subCategories' => $subCategories,
            'authUser'      => [
                'name' => auth()->user()->name,
                'role' => auth()->user()->user_type ?? 'Super Admin',
            ],
        ]);
    }

    /**
     * Store a new product in the catalog.
     */
    public function store(Request $request)
    {
        $request->validate([
            'brand'               => 'nullable|string|max:150',
            'product_name'        => 'required|string|max:150',
            'category_id'         => 'nullable|exists:category,id',
            'sub_category_id'     => 'nullable|exists:sub_categories,id',
            'weight'              => 'nullable|numeric|min:0',
            'unit'                => 'nullable|string|max:50',
            'description'         => 'nullable|string|max:320',
            'images'              => 'required|array|min:5|max:5',
            'images.*'            => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'primary_image_index' => 'required|integer|min:0|max:4',
        ]);

        $imagePaths = [];
        foreach ($request->file('images') as $image) {
            $path = $image->store('product-catalog', 'public');
            $imagePaths[] = '/storage/' . $path;
        }

        $catalog = ProductCatalog::create([
            'brand'               => $request->brand,
            'product_name'        => $request->product_name,
            'category_id'         => $request->category_id,
            'sub_category_id'     => $request->sub_category_id,
            'weight'              => $request->weight,
            'unit'                => $request->unit,
            'description'         => $request->description,
            'images'              => $imagePaths,
            'primary_image_index' => $request->primary_image_index ?? 0,
            'status'              => 'active',
            'created_by'          => auth()->id(),
        ]);

        ActivityLog::log(
            'created',
            "Product catalog entry created: {$request->product_name}",
            $catalog,
            null,
            $catalog->toArray()
        );

        return redirect()->route('dashboard.super-admin.products')
            ->with('success', 'Product registered in catalog successfully.');
    }
}
