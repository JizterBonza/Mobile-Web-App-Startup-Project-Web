<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
        $products = ProductCatalog::listedInCatalog()
            ->with('category', 'subCategory', 'creator')
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
            'products'       => $products,
            'pendingCount'   => ProductCatalog::pending()->count(),
        ]);
    }

    /**
     * Show the Register Product form for Super Admin.
     */
    public function create()
    {
        return Inertia::render('Dashboard/SuperAdmin/RegisterProduct', $this->catalogFormOptions());
    }

    /**
     * Show a single product catalog entry.
     */
    public function show($id)
    {
        $p = ProductCatalog::with('category', 'subCategory', 'creator')->findOrFail($id);

        return Inertia::render('Dashboard/SuperAdmin/ProductShow', [
            'product' => [
                'id'                  => $p->id,
                'brand'               => $p->brand,
                'product_name'        => $p->product_name,
                'category_name'       => optional($p->category)->category_name,
                'sub_category_name'   => optional($p->subCategory)->sub_category_name,
                'weight'              => $p->weight,
                'unit'                => $p->unit,
                'description'         => $p->description,
                'images'              => $p->images ?? [],
                'primary_image_index' => $p->primary_image_index ?? 0,
                'status'              => $p->status,
                'created_by_name'     => optional($p->creator)->name,
                'created_at'          => $p->created_at,
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
            'status'              => ProductCatalog::STATUS_ACTIVE,
            'created_by'          => auth()->id(),
            'reviewed_by'         => auth()->id(),
            'reviewed_at'         => now(),
        ]);

        ActivityLog::log(
            'created',
            "Product catalog entry created: {$request->product_name}",
            $catalog,
            null,
            $catalog->toArray()
        );

        return redirect()->route($this->productsIndexRoute())
            ->with('success', 'Product registered in catalog successfully.');
    }

    /**
     * Show the Edit Product form for a catalog entry.
     */
    public function edit($id)
    {
        $p = ProductCatalog::listedInCatalog()
            ->with('creator')
            ->findOrFail($id);

        return Inertia::render('Dashboard/SuperAdmin/EditProduct', array_merge(
            $this->catalogFormOptions($p->category_id, $p->sub_category_id),
            [
                'product' => [
                    'id'                  => $p->id,
                    'brand'               => $p->brand,
                    'product_name'        => $p->product_name,
                    'category_id'         => $p->category_id,
                    'sub_category_id'     => $p->sub_category_id,
                    'weight'              => $p->weight,
                    'unit'                => $p->unit ?: 'kg',
                    'description'         => $p->description ?? '',
                    'images'              => $p->images ?? [],
                    'primary_image_index' => $p->primary_image_index ?? 0,
                    'status'              => $p->status,
                    'created_by_name'     => optional($p->creator)->name,
                ],
            ]
        ));
    }

    /**
     * Update an existing product catalog entry.
     */
    public function update(Request $request, $id)
    {
        $catalog = ProductCatalog::listedInCatalog()->findOrFail($id);
        $oldValues = $catalog->toArray();

        $request->merge([
            'category_id'     => $request->filled('category_id') ? $request->category_id : null,
            'sub_category_id' => $request->filled('sub_category_id') ? $request->sub_category_id : null,
            'weight'          => $request->filled('weight') ? $request->weight : null,
        ]);

        $request->validate([
            'brand'               => 'nullable|string|max:150',
            'product_name'        => 'required|string|max:150',
            'category_id'         => 'nullable|exists:category,id',
            'sub_category_id'     => 'nullable|exists:sub_categories,id',
            'weight'              => 'nullable|numeric|min:0',
            'unit'                => 'nullable|string|max:50',
            'description'         => 'nullable|string|max:320',
            'images'              => 'nullable|array|max:5',
            'images.*'            => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'primary_image_index' => 'required|integer|min:0|max:4',
            'status'              => 'required|string|in:active,inactive',
        ]);

        $existingImages = array_values($catalog->images ?? []);
        $imagePaths = [];

        for ($i = 0; $i < 5; $i++) {
            if ($request->hasFile("images.{$i}")) {
                $this->deleteCatalogImageIfUnused($existingImages[$i] ?? null, $catalog->id);
                $path = $request->file("images.{$i}")->store('product-catalog', 'public');
                $imagePaths[$i] = '/storage/' . $path;
            } elseif (! empty($existingImages[$i])) {
                $imagePaths[$i] = $existingImages[$i];
            }
        }

        if (count($imagePaths) < 5) {
            return back()
                ->withInput()
                ->withErrors(['images' => 'Please keep or replace all 5 product images.']);
        }

        $catalog->update([
            'brand'               => $request->brand,
            'product_name'        => $request->product_name,
            'category_id'         => $request->category_id,
            'sub_category_id'     => $request->sub_category_id,
            'weight'              => $request->weight,
            'unit'                => $request->unit,
            'description'         => $request->description,
            'images'              => array_values($imagePaths),
            'primary_image_index' => $request->primary_image_index ?? 0,
            'status'              => $request->status,
        ]);

        ActivityLog::log(
            'updated',
            "Product catalog entry updated: {$request->product_name}",
            $catalog,
            $oldValues,
            $catalog->fresh()->toArray()
        );

        return redirect()->route($this->productsIndexRoute())
            ->with('success', 'Product updated successfully.');
    }

    /**
     * Disable or enable a catalog product.
     */
    public function updateStatus(Request $request, $id)
    {
        $catalog = ProductCatalog::listedInCatalog()->findOrFail($id);
        $oldValues = $catalog->toArray();

        $request->validate([
            'status' => 'required|string|in:active,inactive',
        ]);

        $catalog->update(['status' => $request->status]);

        $action = $request->status === ProductCatalog::STATUS_INACTIVE ? 'disabled' : 'enabled';

        ActivityLog::log(
            'updated',
            "Product catalog entry {$action}: {$catalog->product_name}",
            $catalog,
            $oldValues,
            $catalog->fresh()->toArray()
        );

        $message = $request->status === ProductCatalog::STATUS_INACTIVE
            ? 'Product disabled. Agrivets can no longer restock this product when they run out.'
            : 'Product enabled. Agrivets can add and restock this product again.';

        return redirect()->back()->with('success', $message);
    }

    /**
     * @return array<string, mixed>
     */
    private function catalogFormOptions($includeCategoryId = null, $includeSubCategoryId = null): array
    {
        $categories = Category::query()
            ->where(function ($q) use ($includeCategoryId) {
                $q->where('status', 'active');
                if ($includeCategoryId) {
                    $q->orWhere('id', $includeCategoryId);
                }
            })
            ->orderBy('category_name')
            ->get()
            ->map(fn ($c) => ['id' => $c->id, 'name' => $c->category_name]);

        $subCategories = SubCategory::query()
            ->where(function ($q) use ($includeSubCategoryId) {
                $q->where('sub_category_status', 'active');
                if ($includeSubCategoryId) {
                    $q->orWhere('id', $includeSubCategoryId);
                }
            })
            ->orderBy('sub_category_name')
            ->get()
            ->map(fn ($s) => ['id' => $s->id, 'name' => $s->sub_category_name]);

        return [
            'categories'    => $categories,
            'subCategories' => $subCategories,
            'authUser'      => [
                'name' => auth()->user()->name,
                'role' => auth()->user()->user_type ?? 'Super Admin',
            ],
        ];
    }

    private function productsIndexRoute(): string
    {
        return auth()->user()->user_type === 'admin'
            ? 'dashboard.admin.products'
            : 'dashboard.super-admin.products';
    }

    private function deleteCatalogImageIfUnused(?string $url, int $exceptId): void
    {
        if (! $url) {
            return;
        }

        $path = ltrim(str_replace('/storage/', '', $url), '/');

        if (! str_starts_with($path, 'product-catalog/') || str_contains($path, 'placeholder') || str_contains($path, 'agrify-test')) {
            return;
        }

        $stillUsed = ProductCatalog::where('id', '!=', $exceptId)
            ->whereJsonContains('images', $url)
            ->exists();

        if ($stillUsed) {
            return;
        }

        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
