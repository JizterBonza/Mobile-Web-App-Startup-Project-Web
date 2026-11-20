<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\District;
use App\Models\Zone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ZoneController extends Controller
{
    /**
     * Display zones list for Super Admin / Admin dashboard.
     */
    public function index(Request $request)
    {
        $zones = Zone::query()
            ->with('district:id,name')
            ->withCount('shops')
            ->orderBy('name')
            ->get()
            ->map(fn ($zone) => [
                'id' => $zone->id,
                'district_id' => $zone->district_id,
                'district_name' => $zone->district?->name,
                'name' => $zone->name,
                'description' => $zone->description,
                'boundary' => $zone->boundary,
                'status' => $zone->status,
                'status_label' => $zone->status ? 'active' : 'inactive',
                'shops_count' => $zone->shops_count,
                'created_at' => $zone->created_at?->toISOString(),
                'updated_at' => $zone->updated_at?->toISOString(),
            ]);

        $districts = District::query()
            ->orderBy('name')
            ->get()
            ->map(fn ($district) => [
                'id' => $district->id,
                'name' => $district->name,
                'boundary' => $district->boundary,
                'status' => $district->status,
                'status_label' => $district->status ? 'active' : 'inactive',
            ]);

        return Inertia::render('Dashboard/ZonesManagement', [
            'zones' => $zones,
            'districts' => $districts,
            'flash' => $request->session()->get('flash', []),
        ]);
    }

    /**
     * Store a new zone.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'district_id' => 'required|integer|exists:districts,id',
            'name' => 'required|string|max:150',
            'description' => 'nullable|string|max:500',
            'boundary' => 'required|array',
            'boundary.*.lat' => 'required|numeric',
            'boundary.*.lng' => 'required|numeric',
            'status' => 'required|string|in:active,inactive',
        ]);

        $validated['status'] = $validated['status'] === 'active';
        $zone = Zone::create($validated);

        ActivityLog::log(
            'created',
            "Zone created: {$zone->name}",
            $zone,
            null,
            $zone->toArray()
        );

        $redirectRoute = Auth::user()->user_type === 'admin'
            ? 'dashboard.admin.zones.index'
            : 'dashboard.super-admin.zones.index';

        return redirect()->route($redirectRoute)->with('flash', [
            'success' => 'Zone created successfully.',
        ]);
    }

    /**
     * Update an existing zone.
     */
    public function update(Request $request, $id)
    {
        $zone = Zone::findOrFail($id);
        $oldValues = $zone->toArray();

        $validated = $request->validate([
            'district_id' => 'required|integer|exists:districts,id',
            'name' => 'required|string|max:150',
            'description' => 'nullable|string|max:500',
            'boundary' => 'required|array',
            'boundary.*.lat' => 'required|numeric',
            'boundary.*.lng' => 'required|numeric',
            'status' => 'required|string|in:active,inactive',
        ]);

        $validated['status'] = $validated['status'] === 'active';
        $zone->update($validated);

        ActivityLog::log(
            'updated',
            "Zone updated: {$zone->name}",
            $zone,
            $oldValues,
            $zone->fresh()->toArray()
        );

        $redirectRoute = Auth::user()->user_type === 'admin'
            ? 'dashboard.admin.zones.index'
            : 'dashboard.super-admin.zones.index';

        return redirect()->route($redirectRoute)->with('flash', [
            'success' => 'Zone updated successfully.',
        ]);
    }

    /**
     * Delete a zone.
     */
    public function destroy($id)
    {
        $zone = Zone::findOrFail($id);
        $zoneName = $zone->name;
        $zoneArray = $zone->toArray();

        // Unlink shops from this zone instead of blocking delete
        $zone->shops()->update(['zone_id' => null]);
        $zone->delete();

        ActivityLog::log(
            'deleted',
            "Zone deleted: {$zoneName}",
            null,
            $zoneArray,
            null
        );

        $redirectRoute = Auth::user()->user_type === 'admin'
            ? 'dashboard.admin.zones.index'
            : 'dashboard.super-admin.zones.index';

        return redirect()->route($redirectRoute)->with('flash', [
            'success' => 'Zone deleted successfully.',
        ]);
    }
}
