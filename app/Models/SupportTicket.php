<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupportTicket extends Model
{
    public const STATUS_OPEN = 'Open';

    public const STATUS_AWAITING_REVIEW = 'Awaiting Review';

    public const STATUS_INFO_REQUESTED = 'Info Requested';

    public const STATUS_IN_PROGRESS = 'In Progress';

    public const STATUS_RESOLVED = 'Resolved';

    public const STATUS_CLOSED = 'Closed';

    public const CATEGORIES = [
        'Account',
        'Subscription',
        'Order Issues',
        'Store & Listing',
        'Payment Disputes',
        'System',
    ];

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'category',
        'status',
        'reopen_count',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportTicketMessage::class)->orderBy('created_at');
    }

    public function getTicketNumberAttribute(): string
    {
        return 'TKT-'.str_pad((string) $this->id, 4, '0', STR_PAD_LEFT);
    }
}
