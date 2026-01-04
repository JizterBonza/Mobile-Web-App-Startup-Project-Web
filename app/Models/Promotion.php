<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Promotion extends Model
{
    protected $fillable = [
        'agrivet_id',
        'shop_id',
        'name',
        'description',
        'type',
        'discount_value',
        'buy_quantity',
        'get_quantity',
        'minimum_order_amount',
        'maximum_discount',
        'applicable_items',
        'bundle_items',
        'bundle_price',
        'start_date',
        'end_date',
        'usage_limit',
        'usage_count',
        'per_customer_limit',
        'promo_code',
        'status',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'minimum_order_amount' => 'decimal:2',
        'maximum_discount' => 'decimal:2',
        'bundle_price' => 'decimal:2',
        'applicable_items' => 'array',
        'bundle_items' => 'array',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
    ];

    /**
     * Promotion types with labels
     */
    public static function getTypes(): array
    {
        return [
            'percentage_off' => 'Percentage Off',
            'fixed_amount_off' => 'Fixed Amount Off',
            'buy_x_get_y' => 'Buy X Get Y',
            'bundle' => 'Product Bundle',
            'free_shipping' => 'Free Shipping',
        ];
    }

    /**
     * Get the agrivet that owns the promotion.
     */
    public function agrivet()
    {
        return $this->belongsTo(Agrivet::class);
    }

    /**
     * Get the shop that owns the promotion.
     */
    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    /**
     * Check if the promotion is currently active.
     */
    public function isActive(): bool
    {
        $now = now();
        return $this->status === 'active' 
            && $now->between($this->start_date, $this->end_date)
            && ($this->usage_limit === null || $this->usage_count < $this->usage_limit);
    }

    /**
     * Get a human-readable label for the promotion type.
     */
    public function getTypeLabel(): string
    {
        return self::getTypes()[$this->type] ?? $this->type;
    }

    /**
     * Get a formatted description of the promotion.
     */
    public function getFormattedPromotion(): string
    {
        switch ($this->type) {
            case 'percentage_off':
                return "{$this->discount_value}% OFF";
            case 'fixed_amount_off':
                return "\${$this->discount_value} OFF";
            case 'buy_x_get_y':
                return "Buy {$this->buy_quantity} Get {$this->get_quantity} FREE";
            case 'bundle':
                return "Bundle Deal - \${$this->bundle_price}";
            case 'free_shipping':
                return "FREE Shipping";
            default:
                return $this->name;
        }
    }
}

