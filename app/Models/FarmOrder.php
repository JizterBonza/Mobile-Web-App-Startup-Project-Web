<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FarmOrder extends Model
{
    protected $guarded = [];

    protected $casts = [
        'farm_snapshot' => 'array', 'address_snapshot' => 'array',
        'bird_count' => 'integer', 'box_count' => 'integer', 'schedule_version' => 'integer',
        'subtotal_cents' => 'integer', 'deposit_cents' => 'integer',
        'estimate_min_cents' => 'integer', 'estimate_max_cents' => 'integer',
        'per_box_cents' => 'integer', 'shipping_cents' => 'integer', 'total_cents' => 'integer',
        'earliest_release_date' => 'date', 'pickup_date' => 'date',
        'balance_opens_at' => 'datetime', 'balance_due_at' => 'datetime',
        'deposit_paid_at' => 'datetime', 'confirmed_at' => 'datetime',
        'fully_paid_at' => 'datetime', 'release_authorized_at' => 'datetime',
        'held_at' => 'datetime', 'cancelled_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function farm()
    {
        return $this->belongsTo(Farm::class);
    }

    public function items()
    {
        return $this->hasMany(FarmOrderItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'order_id', 'order_id');
    }

    public function events()
    {
        return $this->hasMany(FarmOrderEvent::class)->orderBy('id');
    }
}
