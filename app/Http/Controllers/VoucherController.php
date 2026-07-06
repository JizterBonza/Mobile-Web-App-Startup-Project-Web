<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Voucher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class VoucherController extends Controller
{
    /**
     * Display vouchers page for dashboard (Super Admin / Admin).
     */
    public function index(Request $request)
    {
        $query = Voucher::query();

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $vouchers = $query->orderByDesc('created_at')
            ->get()
            ->map(fn (Voucher $voucher) => $voucher->toDashboardArray());

        return Inertia::render('Dashboard/Vouchers', [
            'vouchers' => $vouchers,
            'voucherTypes' => Voucher::getTypes(),
            'flash' => $request->session()->get('flash', []),
        ]);
    }

    /**
     * Store a new voucher.
     */
    public function store(Request $request)
    {
        $validated = $this->validateVoucher($request);

        $validated['code'] = strtoupper(trim($validated['code']));
        $validated['status'] = Voucher::resolveStatus(
            $validated['status'] ?? null,
            $validated['start_date'],
            $validated['end_date']
        );
        $validated['created_by'] = Auth::id();

        $voucher = Voucher::create($validated);

        ActivityLog::log(
            'created',
            "Voucher created: {$voucher->code}",
            $voucher,
            null,
            $voucher->toArray()
        );

        return redirect()->route($this->redirectRoute())->with('flash', [
            'success' => 'Voucher created successfully!',
        ]);
    }

    /**
     * Update an existing voucher.
     */
    public function update(Request $request, $id)
    {
        $voucher = Voucher::findOrFail($id);
        $oldValues = $voucher->toArray();

        $validated = $this->validateVoucher($request, $voucher->id);

        $validated['code'] = strtoupper(trim($validated['code']));
        $validated['status'] = Voucher::resolveStatus(
            $validated['status'] ?? null,
            $validated['start_date'],
            $validated['end_date']
        );

        $voucher->update($validated);

        ActivityLog::log(
            'updated',
            "Voucher updated: {$voucher->code}",
            $voucher,
            $oldValues,
            $voucher->fresh()->toArray()
        );

        return redirect()->route($this->redirectRoute())->with('flash', [
            'success' => 'Voucher updated successfully!',
        ]);
    }

    /**
     * Delete a voucher.
     */
    public function destroy($id)
    {
        $voucher = Voucher::findOrFail($id);

        if ($voucher->usage_count > 0) {
            return redirect()->route($this->redirectRoute())->with('flash', [
                'error' => 'Cannot delete voucher. It has already been used by customers.',
            ]);
        }

        ActivityLog::log(
            'deleted',
            "Voucher deleted: {$voucher->code}",
            null,
            $voucher->toArray(),
            null
        );

        $voucher->delete();

        return redirect()->route($this->redirectRoute())->with('flash', [
            'success' => 'Voucher deleted successfully!',
        ]);
    }

    private function validateVoucher(Request $request, ?int $voucherId = null): array
    {
        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('vouchers', 'code')->ignore($voucherId),
            ],
            'name' => 'required|string|max:150',
            'description' => 'nullable|string|max:1000',
            'type' => 'required|string|in:percentage_off,fixed_amount_off,free_shipping',
            'discount_value' => 'nullable|numeric|min:0',
            'minimum_order_amount' => 'nullable|numeric|min:0',
            'maximum_discount' => 'nullable|numeric|min:0',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'usage_limit' => 'nullable|integer|min:1',
            'per_customer_limit' => 'nullable|integer|min:1',
            'status' => 'nullable|string|in:active,inactive,scheduled',
        ]);

        if ($validated['type'] !== 'free_shipping' && empty($validated['discount_value'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'discount_value' => ['Discount value is required for this voucher type.'],
            ]);
        }

        if ($validated['type'] === 'percentage_off' && (float) $validated['discount_value'] > 100) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'discount_value' => ['Percentage discount cannot exceed 100%.'],
            ]);
        }

        if ($validated['type'] === 'free_shipping') {
            $validated['discount_value'] = null;
        }

        return $validated;
    }

    private function redirectRoute(): string
    {
        return Auth::user()->user_type === 'admin'
            ? 'dashboard.admin.vouchers.index'
            : 'dashboard.super-admin.vouchers.index';
    }
}
