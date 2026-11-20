<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\District;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DistrictController extends Controller
{
    /**
     * Display districts list for Super Admin / Admin dashboard.
     */
    public function index(Request $request)
    {
        $districts = District::query()
            ->with(['zones:id,district_id,name'])
            ->withCount('zones')
            ->orderBy('name')
            ->get()
            ->map(fn ($district) => [
                'id' => $district->id,
                'name' => $district->name,
                'description' => $district->description,
                'boundary' => $district->boundary,
                'status' => $district->status,
                'status_label' => $district->status ? 'active' : 'inactive',
                'zones_count' => $district->zones_count,
                'zone_names' => $district->zones->pluck('name')->values(),
                'created_at' => $district->created_at?->toISOString(),
                'updated_at' => $district->updated_at?->toISOString(),
            ]);

        return Inertia::render('Dashboard/DistrictsManagement', [
            'districts' => $districts,
            'flash' => $request->session()->get('flash', []),
        ]);
    }

    /**
     * Store a new district.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string|max:500',
            'boundary' => 'required|array',
            'boundary.*.lat' => 'required|numeric',
            'boundary.*.lng' => 'required|numeric',
            'status' => 'required|string|in:active,inactive',
        ]);

        $validated['status'] = $validated['status'] === 'active';
        $district = District::create($validated);

        ActivityLog::log(
            'created',
            "District created: {$district->name}",
            $district,
            null,
            $district->toArray()
        );

        return redirect()->route($this->indexRoute())->with('flash', [
            'success' => 'District created successfully.',
        ]);
    }

    /**
     * Update an existing district.
     */
    public function update(Request $request, $id)
    {
        $district = District::findOrFail($id);
        $oldValues = $district->toArray();

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string|max:500',
            'boundary' => 'required|array',
            'boundary.*.lat' => 'required|numeric',
            'boundary.*.lng' => 'required|numeric',
            'status' => 'required|string|in:active,inactive',
        ]);

        $validated['status'] = $validated['status'] === 'active';
        $district->update($validated);

        ActivityLog::log(
            'updated',
            "District updated: {$district->name}",
            $district,
            $oldValues,
            $district->fresh()->toArray()
        );

        return redirect()->route($this->indexRoute())->with('flash', [
            'success' => 'District updated successfully.',
        ]);
    }

    /**
     * Delete a district. Zones under it are unassigned.
     */
    public function destroy($id)
    {
        $district = District::findOrFail($id);
        $districtName = $district->name;
        $districtArray = $district->toArray();

        $district->zones()->update(['district_id' => null]);
        $district->delete();

        ActivityLog::log(
            'deleted',
            "District deleted: {$districtName}",
            null,
            $districtArray,
            null
        );

        return redirect()->route($this->indexRoute())->with('flash', [
            'success' => 'District deleted successfully.',
        ]);
    }

    private function indexRoute(): string
    {
        return Auth::user()->user_type === 'admin'
            ? 'dashboard.admin.districts.index'
            : 'dashboard.super-admin.districts.index';
    }
}
