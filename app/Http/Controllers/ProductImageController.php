<?php

namespace App\Http\Controllers;

use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ProductImageController extends Controller
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
        
        return $vendor->agrivets->first();
    }

    /**
     * Display the product images listing.
     */
    public function index()
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->route('dashboard.vendor')
                ->with('error', 'You are not associated with any Agrivet.');
        }

        $productImages = ProductImage::where('agrivet_id', $agrivet->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($image) {
                return [
                    'id' => $image->id,
                    'name' => $image->name,
                    'image_url' => $image->image_url,
                    'category' => $image->category,
                    'status' => $image->status,
                    'created_at' => $image->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $image->updated_at->format('Y-m-d H:i:s'),
                ];
            });

        return Inertia::render('Dashboard/Vendor/ProductImages', [
            'productImages' => $productImages,
            'store' => ['id' => $agrivet->id],
        ]);
    }

    /**
     * Store a new product image.
     */
    public function store(Request $request)
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Agrivet.']);
        }

        $request->validate([
            'name' => 'required|string|max:150',
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120',
            'category' => 'nullable|string|max:100',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        // Handle file upload
        $imagePath = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('product-images', 'public');
            $imagePath = '/storage/' . $path;
        }

        ProductImage::create([
            'agrivet_id' => $agrivet->id,
            'name' => $request->name,
            'image_url' => $imagePath,
            'category' => $request->category,
            'status' => $request->status ?? 'active',
        ]);

        return redirect()->route('dashboard.vendor.product-images.index')
            ->with('success', 'Product image added successfully.');
    }

    /**
     * Update an existing product image.
     */
    public function update(Request $request, $id)
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Agrivet.']);
        }

        $productImage = ProductImage::where('id', $id)
            ->where('agrivet_id', $agrivet->id)
            ->first();

        if (!$productImage) {
            return redirect()->back()
                ->withErrors(['error' => 'Product image not found.']);
        }

        $request->validate([
            'name' => 'required|string|max:150',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'category' => 'nullable|string|max:100',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        $updateData = [
            'name' => $request->name,
            'category' => $request->category,
            'status' => $request->status ?? $productImage->status,
        ];

        // Handle new file upload
        if ($request->hasFile('image')) {
            // Delete old image
            if ($productImage->image_url) {
                $oldPath = str_replace('/storage/', '', $productImage->image_url);
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            // Upload new image
            $path = $request->file('image')->store('product-images', 'public');
            $updateData['image_url'] = '/storage/' . $path;
        }

        $productImage->update($updateData);

        return redirect()->route('dashboard.vendor.product-images.index')
            ->with('success', 'Product image updated successfully.');
    }

    /**
     * Delete a product image.
     */
    public function destroy($id)
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return redirect()->back()
                ->withErrors(['error' => 'You are not associated with any Agrivet.']);
        }

        $productImage = ProductImage::where('id', $id)
            ->where('agrivet_id', $agrivet->id)
            ->first();

        if (!$productImage) {
            return redirect()->back()
                ->withErrors(['error' => 'Product image not found.']);
        }

        // Delete the image file
        if ($productImage->image_url) {
            $path = str_replace('/storage/', '', $productImage->image_url);
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }

        $productImage->delete();

        return redirect()->route('dashboard.vendor.product-images.index')
            ->with('success', 'Product image deleted successfully.');
    }

    /**
     * Get active product images for API/AJAX usage.
     */
    public function getActiveImages()
    {
        $agrivet = $this->getVendorAgrivet();

        if (!$agrivet) {
            return response()->json([
                'success' => false,
                'message' => 'You are not associated with any Agrivet.',
                'images' => [],
            ]);
        }

        $productImages = ProductImage::where('agrivet_id', $agrivet->id)
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

        return response()->json([
            'success' => true,
            'images' => $productImages,
        ]);
    }
}

