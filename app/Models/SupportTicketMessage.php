<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupportTicketMessage extends Model
{
    protected $fillable = [
        'support_ticket_id',
        'sender_type',
        'sender_user_id',
        'sender_name',
        'body',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'support_ticket_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(SupportTicketAttachment::class);
    }
}
