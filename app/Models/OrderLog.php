<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderLog extends Model
{
    protected $fillable = [
        'order_id',
        'order_shop_id',
        'event',
        'from_status',
        'to_status',
        'user_id',
        'amount',
        'currency',
        'payment_reference',
        'payment_method',
        'notes',
        'metadata',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'amount' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function orderShop()
    {
        return $this->belongsTo(OrderShop::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
