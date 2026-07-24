<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderDetail extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'order_details';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'order_code',
        'subtotal',
        'shipping_fee',
        'delivery_base_fee',
        'delivery_km_fee',
        'delivery_distance_km',
        'is_reduced_base',
        'heavy_surcharge',
        'heavy_surcharge_units',
        'total_weight_kg',
        'multi_store_fee',
        'mov_penalty_fee',
        'total_amount',
        'address_id',
        'shipping_address',
        'order_instruction',
        'delivery_method_id',
        'payment_method',
        'payment_status',
        'voucher_id',
        'voucher_code',
        'voucher_discount_amount',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'shipping_fee' => 'decimal:2',
            'delivery_base_fee' => 'decimal:2',
            'delivery_km_fee' => 'decimal:2',
            'delivery_distance_km' => 'decimal:3',
            'is_reduced_base' => 'boolean',
            'heavy_surcharge' => 'decimal:2',
            'heavy_surcharge_units' => 'integer',
            'total_weight_kg' => 'decimal:3',
            'multi_store_fee' => 'decimal:2',
            'mov_penalty_fee' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'voucher_discount_amount' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the orders for the order detail.
     */
    public function orders()
    {
        return $this->hasMany(Order::class, 'order_detail_id');
    }

    /**
     * Get the voucher applied to this order detail.
     */
    public function voucher()
    {
        return $this->belongsTo(Voucher::class);
    }

    /**
     * Get the delivery method for the order detail.
     */
    public function deliveryMethod()
    {
        return $this->belongsTo(DeliveryMethod::class, 'delivery_method_id');
    }

    /**
     * Get the address for the order detail.
     */
    public function address()
    {
        return $this->belongsTo(Address::class, 'address_id');
    }
}


