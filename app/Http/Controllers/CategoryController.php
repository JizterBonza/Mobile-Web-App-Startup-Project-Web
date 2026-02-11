<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Category;
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
            'status' => 'required|string|in:active,inactive',
        ]);

        $category = Category::create($validated);

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
            'status' => 'required|string|in:active,inactive',
        ]);

        $category->update($validated);

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

