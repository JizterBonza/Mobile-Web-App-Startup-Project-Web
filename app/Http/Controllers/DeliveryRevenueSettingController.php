<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\DeliveryRevenueSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DeliveryRevenueSettingController extends Controller
{
    public function index(Request $request)
    {
        $settings = DeliveryRevenueSetting::orderByRaw("FIELD(status, 'active', 'draft', 'archived')")
            ->orderByDesc('updated_at')
            ->get();

        return Inertia::render('Dashboard/DeliveryRevenueSettings', [
            'settings' => $settings,
            'flash' => $request->session()->get('flash', []),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());
        $validated['status'] = 'draft';

        $setting = DeliveryRevenueSetting::create($validated);

        ActivityLog::log(
            'created',
            "Delivery revenue setting created (draft #{$setting->id})",
            $setting,
            null,
            $setting->toArray()
        );

        $redirectRoute = Auth::user()->user_type === 'admin'
            ? 'dashboard.admin.delivery-revenue-settings.index'
            : 'dashboard.super-admin.delivery-revenue-settings.index';

        return redirect()->route($redirectRoute)->with('flash', [
            'success' => 'Delivery revenue setting created as draft.',
        ]);
    }

    public function update(Request $request, $id)
    {
        $setting = DeliveryRevenueSetting::findOrFail($id);
        $oldValues = $setting->toArray();

        $validated = $request->validate($this->rules());

        $setting->update($validated);

        ActivityLog::log(
            'updated',
            "Delivery revenue setting updated (#{$setting->id}, status: {$setting->status})",
            $setting,
            $oldValues,
            $setting->fresh()->toArray()
        );

        $redirectRoute = Auth::user()->user_type === 'admin'
            ? 'dashboard.admin.delivery-revenue-settings.index'
            : 'dashboard.super-admin.delivery-revenue-settings.index';

        return redirect()->route($redirectRoute)->with('flash', [
            'success' => 'Delivery revenue setting updated successfully.',
        ]);
    }

    public function activate($id)
    {
        $setting = DeliveryRevenueSetting::findOrFail($id);
        $oldStatus = $setting->status;

        $setting->activate();

        ActivityLog::log(
            'updated',
            "Delivery revenue setting #{$setting->id} activated (was: {$oldStatus})",
            $setting->fresh(),
            ['status' => $oldStatus],
            ['status' => DeliveryRevenueSetting::STATUS_ACTIVE]
        );

        $redirectRoute = Auth::user()->user_type === 'admin'
            ? 'dashboard.admin.delivery-revenue-settings.index'
            : 'dashboard.super-admin.delivery-revenue-settings.index';

        return redirect()->route($redirectRoute)->with('flash', [
            'success' => 'Configuration activated. All other active settings have been archived.',
        ]);
    }

    public function destroy($id)
    {
        $setting = DeliveryRevenueSetting::findOrFail($id);

        if ($setting->status === DeliveryRevenueSetting::STATUS_ACTIVE) {
            $redirectRoute = Auth::user()->user_type === 'admin'
                ? 'dashboard.admin.delivery-revenue-settings.index'
                : 'dashboard.super-admin.delivery-revenue-settings.index';

            return redirect()->route($redirectRoute)->with('flash', [
                'error' => 'Cannot delete the active configuration. Activate another one first.',
            ]);
        }

        ActivityLog::log(
            'deleted',
            "Delivery revenue setting deleted (#{$setting->id}, status: {$setting->status})",
            null,
            $setting->toArray(),
            null
        );

        $setting->delete();

        $redirectRoute = Auth::user()->user_type === 'admin'
            ? 'dashboard.admin.delivery-revenue-settings.index'
            : 'dashboard.super-admin.delivery-revenue-settings.index';

        return redirect()->route($redirectRoute)->with('flash', [
            'success' => 'Delivery revenue setting deleted.',
        ]);
    }

    private function rules(): array
    {
        return [
            'reduced_base_fee'                    => 'required|numeric|min:0',
            'standard_base_fee'                   => 'required|numeric|min:0',
            'reduced_base_weight_threshold_kg'    => 'required|numeric|min:0',
            'included_km'                         => 'required|numeric|min:0',
            'km_rate'                             => 'required|numeric|min:0',
            'weight_free_tier_kg'                 => 'required|numeric|min:0',
            'weight_block_kg'                     => 'required|numeric|min:0.001',
            'heavy_tier1_max_units'               => 'required|integer|min:1',
            'heavy_tier1_fee'                     => 'required|numeric|min:0',
            'heavy_tier2_max_units'               => 'required|integer|min:1',
            'heavy_tier2_fee'                     => 'required|numeric|min:0',
            'heavy_tier3_fee'                     => 'required|numeric|min:0',
            'single_item_heavy_exempt_tolerance_kg' => 'required|numeric|min:0',
            'max_stores_per_order'                => 'required|integer|min:1',
            'inter_store_radius_km'               => 'required|numeric|min:0',
            'multi_store_promo_months'            => 'required|integer|min:0',
            'multi_store_fee_per_extra_store'     => 'required|numeric|min:0',
            'multi_store_third_store_fee'         => 'required|numeric|min:0',
            'mov_first_store'                     => 'required|numeric|min:0',
            'mov_first_store_penalty_fee'         => 'required|numeric|min:0',
            'mov_consecutive_store'               => 'required|numeric|min:0',
            'mov_penalty_base_fee'                => 'required|numeric|min:0',
            'mov_consecutive_store_met_fee'       => 'required|numeric|min:0',
            'pickup_delivery_method_id'           => 'required|integer|min:1',
            'note'                                => 'nullable|string|max:500',
        ];
    }
}
