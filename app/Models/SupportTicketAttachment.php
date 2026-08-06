<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportTicketAttachment extends Model
{
    protected $fillable = [
        'support_ticket_message_id',
        'file_name',
        'file_path',
        'file_size',
        'mime_type',
    ];

    public function message(): BelongsTo
    {
        return $this->belongsTo(SupportTicketMessage::class, 'support_ticket_message_id');
    }

    public function getUrlAttribute(): string
    {
        // Root-relative so attachments work regardless of APP_URL host/port (e.g. artisan serve).
        return '/storage/' . ltrim((string) $this->file_path, '/');
    }
}
