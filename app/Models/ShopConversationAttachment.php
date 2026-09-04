<?php

namespace App\Models;

use App\Support\PublicStorage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShopConversationAttachment extends Model
{
    protected $fillable = [
        'shop_conversation_message_id',
        'file_name',
        'file_path',
        'file_size',
        'mime_type',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(ShopConversationMessage::class, 'shop_conversation_message_id');
    }

    public function getUrlAttribute(): string
    {
        return PublicStorage::url($this->file_path) ?? '';
    }

    public function isImage(): bool
    {
        return is_string($this->mime_type) && str_starts_with($this->mime_type, 'image/');
    }
}
