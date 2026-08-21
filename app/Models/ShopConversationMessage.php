<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShopConversationMessage extends Model
{
    public const TYPE_TEXT = 'text';

    public const TYPE_IMAGES = 'images';

    public const TYPE_FILE = 'file';

    public const TYPE_PRODUCT = 'product';

    public const TYPE_ORDER_UPDATE = 'order_update';

    public const ROLE_CUSTOMER = 'customer';

    public const ROLE_VENDOR = 'vendor';

    public const ROLE_OWNER_MANAGER = 'owner_manager';

    protected $fillable = [
        'shop_conversation_id',
        'sender_user_id',
        'sender_role',
        'type',
        'body',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ShopConversation::class, 'shop_conversation_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_user_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ShopConversationAttachment::class);
    }

    public function isStaffMessage(): bool
    {
        return in_array($this->sender_role, [
            self::ROLE_VENDOR,
            self::ROLE_OWNER_MANAGER,
        ], true);
    }
}
