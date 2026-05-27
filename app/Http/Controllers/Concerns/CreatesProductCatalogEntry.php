<?php

namespace App\Http\Controllers\Concerns;

use App\Models\ProductCatalog;
use Illuminate\Http\Request;

trait CreatesProductCatalogEntry
{
    /**
     * @return array<string, mixed>
     */
    protected function productCatalogValidationRules(): array
    {
        return [
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
        ];
    }

    protected function createProductCatalogFromRequest(Request $request, string $status): ProductCatalog
    {
        $request->validate($this->productCatalogValidationRules());

        $imagePaths = [];
        foreach ($request->file('images') as $image) {
            $path = $image->store('product-catalog', 'public');
            $imagePaths[] = '/storage/' . $path;
        }

        return ProductCatalog::create([
            'brand'               => $request->brand,
            'product_name'        => $request->product_name,
            'category_id'         => $request->category_id,
            'sub_category_id'     => $request->sub_category_id,
            'weight'              => $request->weight,
            'unit'                => $request->unit,
            'description'         => $request->description,
            'images'              => $imagePaths,
            'primary_image_index' => $request->primary_image_index ?? 0,
            'status'              => $status,
            'created_by'          => auth()->id(),
        ]);
    }
}
