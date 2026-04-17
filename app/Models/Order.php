<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'orders';

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;

    /**
     * The name of the "created at" column.
     *
     * @var string
     */
    const CREATED_AT = 'ordered_at';

    /**
     * The name of the "updated at" column.
     *
     * @var string
     */
    const UPDATED_AT = 'updated_at';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'order_detail_id',
        'ordered_at',
    ];

    /**
     * Attributes to append for API (resolved from order_shops).
     *
     * @var array<int, string>
     */
    protected $appends = ['order_status', 'rider_id'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'ordered_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the user that owns the order.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the order detail for the order.
     */
    public function orderDetail()
    {
        return $this->belongsTo(OrderDetail::class, 'order_detail_id');
    }

    /**
     * Get the order items for the order.
     */
    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Get the order_shops for this order (one per shop in the order).
     */
    public function orderShops()
    {
        return $this->hasMany(OrderShop::class);
    }

    /**
     * Get the latest payment attached to this order (null for COD orders).
     * Uses latestOfMany() so retries/new attempts surface the most recent record.
     */
    public function payment()
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    /**
     * Resolve order_status from order_shops (first shop's status) for API compatibility.
     */
    public function getOrderStatusAttribute($value)
    {
        if ($this->relationLoaded('orderShops') && $this->orderShops->isNotEmpty()) {
            return $this->orderShops->first()->order_status;
        }
        return $value;
    }

    /**
     * Resolve rider_id from order_shops (first non-null) for API compatibility.
     */
    public function getRiderIdAttribute($value)
    {
        if ($this->relationLoaded('orderShops')) {
            $firstWithRider = $this->orderShops->firstWhere('rider_id', '!=', null);
            return $firstWithRider ? $firstWithRider->rider_id : null;
        }
        return $value;
    }
}

