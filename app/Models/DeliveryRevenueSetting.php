<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DeliveryRevenueSetting extends Model
{
    use HasFactory;

    const STATUS_ACTIVE = 'active';
    const STATUS_ARCHIVED = 'archived';
    const STATUS_DRAFT = 'draft';

    const CACHE_KEY = 'delivery_revenue_settings:active';

    const CACHE_TTL = 600;

    protected $fillable = [
        'reduced_base_fee',
        'standard_base_fee',
        'reduced_base_weight_threshold_kg',
        'included_km',
        'km_rate',
        'weight_free_tier_kg',
        'weight_block_kg',
        'heavy_tier1_max_units',
        'heavy_tier1_fee',
        'heavy_tier2_max_units',
        'heavy_tier2_fee',
        'heavy_tier3_fee',
        'single_item_heavy_exempt_tolerance_kg',
        'max_stores_per_order',
        'inter_store_radius_km',
        'multi_store_promo_months',
        'multi_store_fee_per_extra_store',
        'multi_store_third_store_fee',
        'mov_first_store',
        'mov_first_store_penalty_fee',
        'mov_consecutive_store',
        'mov_penalty_base_fee',
        'mov_consecutive_store_met_fee',
        'pickup_delivery_method_id',
        'status',
        'note',
    ];

    protected $casts = [
        'reduced_base_fee' => 'decimal:2',
        'standard_base_fee' => 'decimal:2',
        'reduced_base_weight_threshold_kg' => 'decimal:3',
        'included_km' => 'decimal:3',
        'km_rate' => 'decimal:2',
        'weight_free_tier_kg' => 'decimal:3',
        'weight_block_kg' => 'decimal:3',
        'heavy_tier1_max_units' => 'integer',
        'heavy_tier1_fee' => 'decimal:2',
        'heavy_tier2_max_units' => 'integer',
        'heavy_tier2_fee' => 'decimal:2',
        'heavy_tier3_fee' => 'decimal:2',
        'single_item_heavy_exempt_tolerance_kg' => 'decimal:3',
        'max_stores_per_order' => 'integer',
        'inter_store_radius_km' => 'decimal:3',
        'multi_store_promo_months' => 'integer',
        'multi_store_fee_per_extra_store' => 'decimal:2',
        'multi_store_third_store_fee' => 'decimal:2',
        'mov_first_store' => 'decimal:2',
        'mov_first_store_penalty_fee' => 'decimal:2',
        'mov_consecutive_store' => 'decimal:2',
        'mov_penalty_base_fee' => 'decimal:2',
        'mov_consecutive_store_met_fee' => 'decimal:2',
        'pickup_delivery_method_id' => 'integer',
    ];

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public static function getActive(): ?self
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return static::active()->orderByDesc('updated_at')->first();
        });
    }

    public static function flushCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public function activate(?string $note = null): self
    {
        DB::transaction(function () use ($note) {
            static::active()
                ->where('id', '!=', $this->id)
                ->update(['status' => self::STATUS_ARCHIVED]);

            $this->status = self::STATUS_ACTIVE;
            if ($note !== null) {
                $this->note = $note;
            }
            $this->save();
        });

        static::flushCache();

        return $this->fresh();
    }

    protected static function booted(): void
    {
        $flush = function (self $row) {
            if ($row->status === self::STATUS_ACTIVE || $row->isDirty('status')) {
                static::flushCache();
            }
        };

        static::saved($flush);
        static::deleted($flush);
    }
}
