<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProofOfDelivery extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'proof_of_delivery';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'order_id',
        'order_shop_id',
        'rider_id',
        'latitude',
        'longitude',
        'image_path',
        'remarks',
        'status',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the order for the proof of delivery.
     */
    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function orderShop()
    {
        return $this->belongsTo(OrderShop::class);
    }

    public function images()
    {
        return $this->hasMany(ProofOfDeliveryImage::class)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /** @return array<int, string> */
    public function resolvedImagePaths(): array
    {
        $paths = $this->relationLoaded('images')
            ? $this->images->pluck('image_path')->filter()->values()->all()
            : $this->images()->pluck('image_path')->filter()->values()->all();

        if ($paths === [] && is_string($this->image_path) && $this->image_path !== '') {
            $paths[] = $this->image_path;
        }

        return $paths;
    }

    /**
     * Get the order detail for the proof of delivery (accessed through order relationship).
     * This is an accessor that accesses OrderDetail through the Order relationship.
     */
    public function getOrderDetailAttribute()
    {
        return $this->order?->orderDetail;
    }
}
