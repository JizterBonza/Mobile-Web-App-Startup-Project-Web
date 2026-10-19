<?php

namespace App\Http\Controllers\Concerns;

use App\Models\ProductCatalog;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\File\UploadedFile;

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
            'images'              => 'required|array|min:1|max:5',
            'images.*'            => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'primary_image_index' => 'required|integer|min:0|max:4',
        ];
    }

    /**
     * Drop blank image slots so unused upload boxes are not validated as images.
     */
    protected function keepOnlyUploadedCatalogImages(Request $request): void
    {
        $images = $request->files->get('images');
        $uploaded = [];

        if (is_array($images)) {
            foreach ($images as $slot => $file) {
                if ($file instanceof UploadedFile && $file->isValid()) {
                    $uploaded[$slot] = $file;
                }
            }
        }

        // Blank slots are posted as empty strings. Remove them so validation
        // only sees the photos that were actually uploaded.
        $request->request->remove('images');
        $request->files->set('images', $uploaded);
    }

    /**
     * Store uploaded slots in order and map the chosen slot to the saved image list.
     *
     * @return array{images: array<int, string>, primary_image_index: int}
     */
    protected function catalogImagesFromRequest(Request $request): array
    {
        $files = $request->file('images') ?? [];
        ksort($files);

        $imagePaths = [];
        $storedIndexBySlot = [];

        foreach ($files as $slot => $image) {
            if (! $image) {
                continue;
            }

            $path = $image->store('product-catalog', 'public');
            $storedIndexBySlot[(int) $slot] = count($imagePaths);
            $imagePaths[] = '/storage/' . $path;
        }

        $primarySlot = (int) $request->input('primary_image_index', 0);

        return [
            'images' => $imagePaths,
            'primary_image_index' => $storedIndexBySlot[$primarySlot] ?? 0,
        ];
    }

    protected function createProductCatalogFromRequest(Request $request, string $status): ProductCatalog
    {
        $this->keepOnlyUploadedCatalogImages($request);
        $request->validate($this->productCatalogValidationRules());

        $stored = $this->catalogImagesFromRequest($request);

        return ProductCatalog::create([
            'brand'               => $request->brand,
            'product_name'        => $request->product_name,
            'category_id'         => $request->category_id,
            'sub_category_id'     => $request->sub_category_id,
            'weight'              => $request->weight,
            'unit'                => $request->unit,
            'description'         => $request->description,
            'images'              => $stored['images'],
            'primary_image_index' => $stored['primary_image_index'],
            'status'              => $status,
            'created_by'          => auth()->id(),
        ]);
    }
}
