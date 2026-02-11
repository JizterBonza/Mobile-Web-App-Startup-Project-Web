<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\SubCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubCategoryController extends Controller
{
    /**
     * Display sub-categories page for dashboard
     *
     * @param Request $request
     * @return \Inertia\Response
     */
    public function dashboardIndex(Request $request)
    {
        $query = SubCategory::query();

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('sub_category_status', $request->status);
        }

        // Order by sub category name
        $query->orderBy('sub_category_name', 'asc');

        $subCategories = $query->get();

        return Inertia::render('Dashboard/SubCategories', [
            'subCategories' => $subCategories,
            'flash' => $request->session()->get('flash', []),
        ]);
    }

    /**
     * Store a new sub-category
     *
     * @param Request $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'sub_category_name' => 'required|string|max:150|unique:sub_categories,sub_category_name',
            'sub_category_description' => 'nullable|string',
            'sub_category_status' => 'required|string|in:active,inactive',
        ]);

        $subCategory = SubCategory::create($validated);

        ActivityLog::log('created', "Sub-category created: {$subCategory->sub_category_name}", $subCategory, null, $subCategory->toArray());

        return redirect()->back()->with('flash', [
            'success' => 'Sub-Category created successfully!'
        ]);
    }

    /**
     * Update an existing sub-category
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, $id)
    {
        $subCategory = SubCategory::findOrFail($id);
        $oldValues = $subCategory->toArray();

        $validated = $request->validate([
            'sub_category_name' => 'required|string|max:150|unique:sub_categories,sub_category_name,' . $id,
            'sub_category_description' => 'nullable|string',
            'sub_category_status' => 'required|string|in:active,inactive',
        ]);

        $subCategory->update($validated);

        ActivityLog::log('updated', "Sub-category updated: {$subCategory->sub_category_name}", $subCategory, $oldValues, $subCategory->fresh()->toArray());

        return redirect()->back()->with('flash', [
            'success' => 'Sub-Category updated successfully!'
        ]);
    }

    /**
     * Delete a sub-category
     *
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy($id)
    {
        $subCategory = SubCategory::findOrFail($id);

        // Check if sub-category has items
        if ($subCategory->items()->count() > 0) {
            return redirect()->back()->with('flash', [
                'error' => 'Cannot delete sub-category. It has associated products.'
            ]);
        }

        ActivityLog::log('deleted', "Sub-category deleted: {$subCategory->sub_category_name}", null, $subCategory->toArray(), null);

        $subCategory->delete();

        return redirect()->back()->with('flash', [
            'success' => 'Sub-Category deleted successfully!'
        ]);
    }
}
