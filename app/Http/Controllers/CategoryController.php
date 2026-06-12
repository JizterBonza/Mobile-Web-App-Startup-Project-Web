<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\CategoryRateLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategoryController extends Controller
{
    /**
     * Display categories page for dashboard
     *
     * @param Request $request
     * @return \Inertia\Response
     */
    public function dashboardIndex(Request $request)
    {
        $query = Category::query();

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Order by category name
        $query->orderBy('category_name', 'asc');

        $categories = $query->get();

        return Inertia::render('Dashboard/Categories', [
            'categories' => $categories,
            'flash' => $request->session()->get('flash', []),
        ]);
    }

    /**
     * Store a new category
     *
     * @param Request $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_name' => 'required|string|max:100|unique:category,category_name',
            'category_description' => 'nullable|string',
            'category_image_url' => 'nullable|string|max:255',
            'category_rate' => 'required|numeric|min:0|max:100',
            'status' => 'required|string|in:active,inactive',
        ]);

        $category = Category::create($validated);

        CategoryRateLog::logChange($category, null, (float) $validated['category_rate']);
        ActivityLog::log(
            'category_rate_changed',
            "Initial category rate set for {$category->category_name}: {$validated['category_rate']}%",
            $category,
            null,
            ['category_rate' => $validated['category_rate']]
        );
        ActivityLog::log('created', "Category created: {$category->category_name}", $category, null, $category->toArray());

        return redirect()->back()->with('flash', [
            'success' => 'Category created successfully!'
        ]);
    }

    /**
     * Update an existing category
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);
        $oldValues = $category->toArray();

        $validated = $request->validate([
            'category_name' => 'required|string|max:100|unique:category,category_name,' . $id,
            'category_description' => 'nullable|string',
            'category_image_url' => 'nullable|string|max:255',
            'category_rate' => 'required|numeric|min:0|max:100',
            'status' => 'required|string|in:active,inactive',
        ]);

        $oldRate = $oldValues['category_rate'] ?? null;
        $newRate = (float) $validated['category_rate'];

        $category->update($validated);

        $rateChanged = $oldRate === null
            || bccomp(number_format((float) $oldRate, 2, '.', ''), number_format($newRate, 2, '.', ''), 2) !== 0;

        if ($rateChanged) {
            CategoryRateLog::logChange(
                $category,
                $oldRate !== null ? (float) $oldRate : null,
                $newRate
            );

            $oldLabel = $oldRate !== null ? "{$oldRate}%" : 'none';
            ActivityLog::log(
                'category_rate_changed',
                "Category rate changed for {$category->category_name}: {$oldLabel} → {$newRate}%",
                $category,
                ['category_rate' => $oldRate],
                ['category_rate' => $newRate]
            );
        }

        ActivityLog::log('updated', "Category updated: {$category->category_name}", $category, $oldValues, $category->fresh()->toArray());

        return redirect()->back()->with('flash', [
            'success' => 'Category updated successfully!'
        ]);
    }

    /**
     * Delete a category
     *
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy($id)
    {
        $category = Category::findOrFail($id);

        // Check if category has items
        if ($category->items()->count() > 0) {
            return redirect()->back()->with('flash', [
                'error' => 'Cannot delete category. It has associated products.'
            ]);
        }

        ActivityLog::log('deleted', "Category deleted: {$category->category_name}", null, $category->toArray(), null);

        $category->delete();

        return redirect()->back()->with('flash', [
            'success' => 'Category deleted successfully!'
        ]);
    }

    /**
     * Fetch rate change history for a category.
     */
    public function rateHistory($id)
    {
        $category = Category::findOrFail($id);

        $logs = CategoryRateLog::query()
            ->with([
                'user:id,user_detail_id',
                'user.userDetail:id,first_name,last_name,email',
            ])
            ->where('category_id', $category->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(function (CategoryRateLog $log) {
                $detail = $log->user?->userDetail;
                $userName = $detail
                    ? trim(($detail->first_name ?? '') . ' ' . ($detail->last_name ?? '')) ?: ($detail->email ?? null)
                    : null;

                return [
                    'id' => $log->id,
                    'old_rate' => $log->old_rate,
                    'new_rate' => $log->new_rate,
                    'changed_by' => $userName ?: ($log->user_id ? "User #{$log->user_id}" : 'System'),
                    'created_at' => $log->created_at?->toIso8601String(),
                ];
            });

        return response()->json([
            'success' => true,
            'category' => [
                'id' => $category->id,
                'category_name' => $category->category_name,
                'category_rate' => $category->category_rate,
            ],
            'data' => $logs,
        ]);
    }

    /**
     * Fetch all categories (API endpoint)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $query = Category::query();

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        } else {
            // Default to active categories only
            $query->where('status', 'active');
        }

        // Order by category name
        $query->orderBy('category_name', 'asc');

        $categories = $query->get();

        return response()->json([
            'success' => true,
            'data' => $categories,
            'count' => $categories->count()
        ]);
    }

    /**
     * Fetch a single category by ID (API endpoint)
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $category
        ]);
    }
}

