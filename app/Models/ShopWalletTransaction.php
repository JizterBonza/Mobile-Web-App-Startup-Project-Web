<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShopWalletTransaction extends Model
{
    use HasFactory;

    public const TYPE_CREDIT = 'credit';

    public const TYPE_DEBIT = 'debit';

    public const REASON_SALE = 'sale';

    public const REASON_PAYOUT = 'payout';

    public const REASON_PAYOUT_REVERSAL = 'payout_reversal';

    protected $fillable = [
        'shop_id',
        'type',
        'amount',
        'balance_after',
        'reason',
        'order_item_id',
        'payout_id',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'balance_after' => 'decimal:2',
        ];
    }

    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function payout()
    {
        return $this->belongsTo(Payout::class);
    }
}
