<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\DeliveryMethod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DeliveryMethodController extends Controller
{
    /**
     * Display delivery methods page for dashboard (Super Admin / Admin).
     *
     * @param Request $request
     * @return \Inertia\Response
     */
    public function index(Request $request)
    {
        $query = DeliveryMethod::query();

        if ($request->has('status')) {
            if ($request->status === 'active') {
                $query->where('status', true);
            } elseif ($request->status === 'inactive') {
                $query->where('status', false);
            }
        }

        $deliveryMethods = $query->orderBy('description', 'asc')->get()->map(function ($dm) {
            return [
                'id' => $dm->id,
                'description' => $dm->description,
                'status' => $dm->status,
                'status_label' => $dm->status ? 'active' : 'inactive',
                'created_at' => $dm->created_at?->toISOString(),
                'updated_at' => $dm->updated_at?->toISOString(),
            ];
        });

        return Inertia::render('Dashboard/DeliveryMethods', [
            'deliveryMethods' => $deliveryMethods,
            'flash' => $request->session()->get('flash', []),
        ]);
    }

    /**
     * Store a new delivery method.
     *
     * @param Request $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'description' => 'required|string|max:100|unique:delivery_method,description',
            'status' => 'required|string|in:active,inactive',
        ]);

        $validated['status'] = $validated['status'] === 'active';

        $deliveryMethod = DeliveryMethod::create($validated);

        ActivityLog::log(
            'created',
            "Delivery method created: {$deliveryMethod->description}",
            $deliveryMethod,
            null,
            $deliveryMethod->toArray()
        );

        $redirectRoute = Auth::user()->user_type === 'admin'
            ? 'dashboard.admin.delivery-methods.index'
            : 'dashboard.super-admin.delivery-methods.index';

        return redirect()->route($redirectRoute)->with('flash', [
            'success' => 'Delivery method created successfully!',
        ]);
    }

    /**
     * Update an existing delivery method.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, $id)
    {
        $deliveryMethod = DeliveryMethod::findOrFail($id);
        $oldValues = $deliveryMethod->toArray();

        $validated = $request->validate([
            'description' => 'required|string|max:100|unique:delivery_method,description,' . $id,
            'status' => 'required|string|in:active,inactive',
        ]);

        $validated['status'] = $validated['status'] === 'active';

        $deliveryMethod->update($validated);

        ActivityLog::log(
            'updated',
            "Delivery method updated: {$deliveryMethod->description}",
            $deliveryMethod,
            $oldValues,
            $deliveryMethod->fresh()->toArray()
        );

        $redirectRoute = Auth::user()->user_type === 'admin'
            ? 'dashboard.admin.delivery-methods.index'
            : 'dashboard.super-admin.delivery-methods.index';

        return redirect()->route($redirectRoute)->with('flash', [
            'success' => 'Delivery method updated successfully!',
        ]);
    }

    /**
     * Delete a delivery method.
     *
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy($id)
    {
        $deliveryMethod = DeliveryMethod::findOrFail($id);

        if (DB::table('order_details')->where('delivery_method_id', $id)->exists()) {
            $redirectRoute = Auth::user()->user_type === 'admin'
                ? 'dashboard.admin.delivery-methods.index'
                : 'dashboard.super-admin.delivery-methods.index';
            return redirect()->route($redirectRoute)->with('flash', [
                'error' => 'Cannot delete delivery method. It is used by existing orders.',
            ]);
        }

        ActivityLog::log(
            'deleted',
            "Delivery method deleted: {$deliveryMethod->description}",
            null,
            $deliveryMethod->toArray(),
            null
        );

        $deliveryMethod->delete();

        $redirectRoute = Auth::user()->user_type === 'admin'
            ? 'dashboard.admin.delivery-methods.index'
            : 'dashboard.super-admin.delivery-methods.index';

        return redirect()->route($redirectRoute)->with('flash', [
            'success' => 'Delivery method deleted successfully!',
        ]);
    }
}
