<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'order_items';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'order_id',
        'item_id',
        'shop_id',
        'item_name_at_purchase',
        'quantity',
        'price_at_purchase',
        'original_price',
        'platform_fee',
        'discount_percent_at_purchase',
        'item_status',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'price_at_purchase' => 'decimal:2',
            'original_price' => 'decimal:2',
            'platform_fee' => 'decimal:2',
            'discount_percent_at_purchase' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'unit_price_paid',
        'list_price_at_purchase',
        'line_total_paid',
    ];

    /**
     * Unit price actually paid (frozen at checkout).
     */
    public function getUnitPricePaidAttribute(): float
    {
        return (float) $this->price_at_purchase;
    }

    /**
     * List price before discount at checkout (frozen at purchase time).
     */
    public function getListPriceAtPurchaseAttribute(): float
    {
        return (float) ($this->original_price ?? $this->price_at_purchase);
    }

    /**
     * Line total using the frozen paid unit price.
     */
    public function getLineTotalPaidAttribute(): float
    {
        return round((float) $this->price_at_purchase * (int) $this->quantity, 2);
    }

    /**
     * Platform fee for a line item based on category rate at purchase time.
     */
    public static function calculatePlatformFee(float $unitPrice, int $quantity, ?float $categoryRate): float
    {
        $rate = (float) ($categoryRate ?? 0);
        if ($rate <= 0) {
            return 0.0;
        }

        return round($unitPrice * $quantity * ($rate / 100), 2);
    }

    /**
     * Get the order that owns the order item.
     */
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the item for the order item.
     */
    public function item()
    {
        return $this->belongsTo(Item::class, 'item_id');
    }
}


