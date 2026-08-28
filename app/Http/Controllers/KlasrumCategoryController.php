<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\KlasrumCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class KlasrumCategoryController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
        ]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('klasrum_categories', 'name')->whereNull('deleted_at')],
        ]);

        $category = KlasrumCategory::create([
            'name' => $validated['name'],
            'active' => 1,
        ]);

        ActivityLog::log(
            'created',
            'Klasrum category created: ' . $category->name,
            $category,
            null,
            $category->toArray()
        );

        return back()->with('success', 'Category created.');
    }

    public function update(Request $request, KlasrumCategory $category): RedirectResponse
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
        ]);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('klasrum_categories', 'name')->whereNull('deleted_at')->ignore($category->id),
            ],
        ]);

        $oldValues = $category->toArray();
        $category->update([
            'name' => $validated['name'],
        ]);

        ActivityLog::log(
            'updated',
            'Klasrum category updated: ' . $category->name,
            $category,
            $oldValues,
            $category->fresh()->toArray()
        );

        return back()->with('success', 'Category updated.');
    }

    public function destroy(KlasrumCategory $category): RedirectResponse
    {
        $oldValues = $category->toArray();
        $category->delete();

        ActivityLog::log(
            'deleted',
            'Klasrum category deleted: ' . $category->name,
            $category,
            $oldValues,
            $category->toArray()
        );

        return back()->with('success', 'Category deleted.');
    }
}
