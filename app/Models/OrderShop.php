<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderShop extends Model
{
    use HasFactory;

    protected $table = 'order_shops';

    protected $fillable = [
        'order_id',
        'shop_id',
        'rider_id',
        'order_status',
    ];

    protected function casts(): array
    {
        return [
            'order_status' => 'integer',
        ];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    public function rider()
    {
        return $this->belongsTo(User::class, 'rider_id');
    }

    public function status()
    {
        return $this->belongsTo(OrderStatus::class, 'order_status', 'id');
    }
}
