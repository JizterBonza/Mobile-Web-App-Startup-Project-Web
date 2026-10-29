<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayoutSale extends Model
{
    protected $fillable = [
        'payout_id',
        'shop_wallet_transaction_id',
        'order_item_id',
        'order_id',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function payout()
    {
        return $this->belongsTo(Payout::class);
    }

    public function walletTransaction()
    {
        return $this->belongsTo(ShopWalletTransaction::class, 'shop_wallet_transaction_id');
    }

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }
}
