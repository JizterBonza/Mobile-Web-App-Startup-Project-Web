<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\ProductCatalog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductCatalogRequestController extends Controller
{
    private function requestsBaseRoute(): string
    {
        return auth()->user()->user_type === 'admin'
            ? '/dashboard/admin/product-requests'
            : '/dashboard/super-admin/product-requests';
    }

    public function index()
    {
        $requests = ProductCatalog::pending()
            ->with(['category', 'subCategory', 'creator'])
            ->latest()
            ->get()
            ->map(fn ($p) => $this->mapRequest($p));

        return Inertia::render('Dashboard/SuperAdmin/ProductRequests', [
            'requests'       => $requests,
            'requestsBase'   => $this->requestsBaseRoute(),
            'pendingCount'   => $requests->count(),
        ]);
    }

    public function approve($id)
    {
        $catalog = ProductCatalog::pending()->findOrFail($id);

        $duplicate = ProductCatalog::approved()
            ->where('product_name', $catalog->product_name)
            ->where('id', '!=', $catalog->id)
            ->exists();

        if ($duplicate) {
            return redirect()->back()
                ->withErrors(['error' => 'An active product with this name already exists in the catalog.']);
        }

        $old = $catalog->toArray();
        $catalog->update([
            'status'      => ProductCatalog::STATUS_ACTIVE,
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
        ]);

        ActivityLog::log(
            'updated',
            "Product registration request approved: {$catalog->product_name}",
            $catalog,
            $old,
            $catalog->fresh()->toArray()
        );

        return redirect()->back()
            ->with('success', "Product \"{$catalog->product_name}\" has been approved and added to the catalog.");
    }

    public function reject(Request $request, $id)
    {
        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $catalog = ProductCatalog::pending()->findOrFail($id);
        $old = $catalog->toArray();

        $catalog->update([
            'status'      => ProductCatalog::STATUS_REJECTED,
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
        ]);

        ActivityLog::log(
            'updated',
            "Product registration request rejected: {$catalog->product_name}",
            $catalog,
            $old,
            $catalog->fresh()->toArray()
        );

        return redirect()->back()
            ->with('success', "Product request \"{$catalog->product_name}\" has been rejected.");
    }

    /**
     * @return array<string, mixed>
     */
    private function mapRequest(ProductCatalog $p): array
    {
        return [
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
            'created_by_role'     => optional($p->creator)->user_type,
            'created_at'          => $p->created_at,
        ];
    }
}
