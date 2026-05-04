<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_FAILED = 'failed';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
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
        'raw_payload',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'raw_payload' => 'array',
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    public static function canonicalStatuses(): array
    {
        return [
            self::STATUS_PENDING,
            self::STATUS_PAID,
            self::STATUS_FAILED,
            self::STATUS_EXPIRED,
            self::STATUS_CANCELLED,
        ];
    }

    public static function normalizeStatus(?string $status): string
    {
        $value = strtolower(trim((string) $status));

        return match ($value) {
            self::STATUS_PAID => self::STATUS_PAID,
            self::STATUS_FAILED => self::STATUS_FAILED,
            self::STATUS_EXPIRED => self::STATUS_EXPIRED,
            self::STATUS_CANCELLED => self::STATUS_CANCELLED,
            'refunded',
            'partially_refunded' => self::STATUS_PAID,
            default => self::STATUS_PENDING,
        };
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
