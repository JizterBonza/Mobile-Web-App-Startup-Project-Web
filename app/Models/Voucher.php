<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Voucher extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'type',
        'discount_value',
        'minimum_order_amount',
        'maximum_discount',
        'start_date',
        'end_date',
        'usage_limit',
        'usage_count',
        'per_customer_limit',
        'status',
        'created_by',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'minimum_order_amount' => 'decimal:2',
        'maximum_discount' => 'decimal:2',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'usage_limit' => 'integer',
        'usage_count' => 'integer',
        'per_customer_limit' => 'integer',
    ];

    public static function getTypes(): array
    {
        return [
            'percentage_off' => 'Percentage Off',
            'fixed_amount_off' => 'Fixed Amount Off',
            'free_shipping' => 'Free Shipping',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public static function resolveStatus(?string $status, $startDate, $endDate): string
    {
        if ($status === 'inactive') {
            return 'inactive';
        }

        $now = now();
        $start = $startDate instanceof \Carbon\Carbon ? $startDate : \Carbon\Carbon::parse($startDate);
        $end = $endDate instanceof \Carbon\Carbon ? $endDate : \Carbon\Carbon::parse($endDate);

        if ($end->isPast()) {
            return 'expired';
        }

        if ($start->isFuture()) {
            return 'scheduled';
        }

        return 'active';
    }

    public function toDashboardArray(): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'type' => $this->type,
            'type_label' => self::getTypes()[$this->type] ?? $this->type,
            'discount_value' => $this->discount_value,
            'minimum_order_amount' => $this->minimum_order_amount,
            'maximum_discount' => $this->maximum_discount,
            'start_date' => $this->start_date?->toISOString(),
            'end_date' => $this->end_date?->toISOString(),
            'usage_limit' => $this->usage_limit,
            'usage_count' => $this->usage_count,
            'per_customer_limit' => $this->per_customer_limit,
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
