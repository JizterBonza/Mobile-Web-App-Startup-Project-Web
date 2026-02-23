<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PaymentMethodController extends Controller
{
    /**
     * Display payment methods page for dashboard (Super Admin / Admin).
     *
     * @param Request $request
     * @return \Inertia\Response
     */
    public function index(Request $request)
    {
        $query = PaymentMethod::query();

        if ($request->has('status')) {
            if ($request->status === 'active') {
                $query->where('status', true);
            } elseif ($request->status === 'inactive') {
                $query->where('status', false);
            }
        }

        $paymentMethods = $query->orderBy('name', 'asc')->get()->map(function ($pm) {
            return [
                'id' => $pm->id,
                'name' => $pm->name,
                'status' => $pm->status,
                'status_label' => $pm->status ? 'active' : 'inactive',
                'created_at' => $pm->created_at?->toISOString(),
                'updated_at' => $pm->updated_at?->toISOString(),
            ];
        });

        return Inertia::render('Dashboard/PaymentMethods', [
            'paymentMethods' => $paymentMethods,
            'flash' => $request->session()->get('flash', []),
        ]);
    }

    /**
     * Store a new payment method.
     *
     * @param Request $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:payment_methods,name',
            'status' => 'required|string|in:active,inactive',
        ]);

        $validated['status'] = $validated['status'] === 'active';

        $paymentMethod = PaymentMethod::create($validated);

        ActivityLog::log(
            'created',
            "Payment method created: {$paymentMethod->name}",
            $paymentMethod,
            null,
            $paymentMethod->toArray()
        );

        $redirectRoute = auth()->user()->user_type === 'admin'
            ? 'dashboard.admin.payment-methods.index'
            : 'dashboard.super-admin.payment-methods.index';

        return redirect()->route($redirectRoute)->with('flash', [
            'success' => 'Payment method created successfully!',
        ]);
    }

    /**
     * Update an existing payment method.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, $id)
    {
        $paymentMethod = PaymentMethod::findOrFail($id);
        $oldValues = $paymentMethod->toArray();

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:payment_methods,name,' . $id,
            'status' => 'required|string|in:active,inactive',
        ]);

        $validated['status'] = $validated['status'] === 'active';

        $paymentMethod->update($validated);

        ActivityLog::log(
            'updated',
            "Payment method updated: {$paymentMethod->name}",
            $paymentMethod,
            $oldValues,
            $paymentMethod->fresh()->toArray()
        );

        $redirectRoute = auth()->user()->user_type === 'admin'
            ? 'dashboard.admin.payment-methods.index'
            : 'dashboard.super-admin.payment-methods.index';

        return redirect()->route($redirectRoute)->with('flash', [
            'success' => 'Payment method updated successfully!',
        ]);
    }

    /**
     * Delete a payment method.
     *
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy($id)
    {
        $paymentMethod = PaymentMethod::findOrFail($id);

        if (DB::table('order_details')->where('payment_method', $id)->exists()) {
            $redirectRoute = auth()->user()->user_type === 'admin'
                ? 'dashboard.admin.payment-methods.index'
                : 'dashboard.super-admin.payment-methods.index';
            return redirect()->route($redirectRoute)->with('flash', [
                'error' => 'Cannot delete payment method. It is used by existing orders.',
            ]);
        }

        ActivityLog::log(
            'deleted',
            "Payment method deleted: {$paymentMethod->name}",
            null,
            $paymentMethod->toArray(),
            null
        );

        $paymentMethod->delete();

        $redirectRoute = auth()->user()->user_type === 'admin'
            ? 'dashboard.admin.payment-methods.index'
            : 'dashboard.super-admin.payment-methods.index';

        return redirect()->route($redirectRoute)->with('flash', [
            'success' => 'Payment method deleted successfully!',
        ]);
    }
}
