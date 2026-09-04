<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payout extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_SUCCESS = 'success';

    public const STATUS_FAILED = 'failed';

    public const PROVIDER_PAYMONGO = 'paymongo';

    protected $fillable = [
        'reference_number',
        'shop_id',
        'user_id',
        'amount',
        'currency',
        'provider',
        'destination_account_number',
        'destination_account_name',
        'destination_account_bic',
        'source_account_number',
        'source_account_name',
        'source_account_bic',
        'payload',
        'status',
        'created_by',
        'idempotency_key',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payload' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    /**
     * Super Admin/Admin: all shops.
     * Owner Manager: shops under their agrivet.
     * Vendor: the shop they are assigned to.
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return match ($user->user_type) {
            User::TYPE_SUPER_ADMIN, User::TYPE_ADMIN => $query,
            User::TYPE_OWNER_MANAGER => $user->agrivet_id
                ? $query->whereHas(
                    'shop',
                    fn (Builder $shopQuery) => $shopQuery->where('agrivet_id', $user->agrivet_id)
                )
                : $query->whereRaw('1 = 0'),
            User::TYPE_VENDOR => $query->whereIn(
                'shop_id',
                $user->shops()->select('shops.id')
            ),
            default => $query->whereRaw('1 = 0'),
        };
    }
}
