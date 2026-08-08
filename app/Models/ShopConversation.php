<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShopConversation extends Model
{
    protected $fillable = [
        'shop_id',
        'customer_user_id',
        'last_message_at',
        'last_message_preview',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_user_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ShopConversationMessage::class)->orderBy('created_at');
    }

    public function reads(): HasMany
    {
        return $this->hasMany(ShopConversationRead::class);
    }
}
