<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DiscountLog extends Model
{
    use HasFactory;

    protected $table = 'discount_logs';

    protected $fillable = [
        'item_id',
        'original_price',
        'actual_discount',
        'discounted_price',
        'discount_percent',
        'discount_type',
        'discount_expires_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'original_price' => 'decimal:2',
            'actual_discount' => 'decimal:2',
            'discounted_price' => 'decimal:2',
            'discount_percent' => 'decimal:2',
            'discount_expires_at' => 'datetime',
            'is_active' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function isExpiryValid(): bool
    {
        if ($this->discount_expires_at === null) {
            return true;
        }

        return now()->lessThanOrEqualTo($this->discount_expires_at);
    }

    /**
     * Deactivate this log if discount_expires_at has passed.
     * Returns true when the log remains active and valid.
     */
    public function deactivateIfExpired(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        if ($this->isExpiryValid()) {
            return true;
        }

        $this->update(['is_active' => false]);

        return false;
    }
}
