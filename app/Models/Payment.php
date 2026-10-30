<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_user_id',
        'last_reconciled_at',
        'purpose',
        'schedule_version',
        'attempt_key',
        'order_id',
        'checkout_session_id',
        'payment_intent_id',
        'payment_id',
        'checkout_url',
        'amount',
        'currency',
        'payment_method',
        'status',
        'provider',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'amount' => 'decimal:2',
            'last_reconciled_at' => 'datetime',
        ];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
