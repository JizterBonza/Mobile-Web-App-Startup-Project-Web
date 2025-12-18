<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'category',
        'title',
        'message',
        'reference_type',
        'reference_id',
        'data',
        'read',
        'read_at',
        'action_url',
    ];
    
    protected $casts = [
        'data' => 'array',
        'read' => 'boolean',
        'read_at' => 'datetime',
    ];

    /**
     * Notification categories
     */
    const CATEGORY_GENERAL = 'general';
    const CATEGORY_ORDER = 'order';
    const CATEGORY_PAYMENT = 'payment';
    const CATEGORY_PROMO = 'promo';
    const CATEGORY_SYSTEM = 'system';

    /**
     * Get the user that owns the notification.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the referenced model (Order, Item, Shop, etc.)
     */
    public function reference()
    {
        return $this->morphTo();
    }

    /**
     * Mark notification as read.
     */
    public function markAsRead()
    {
        $this->update(['read' => true, 'read_at' => now()]);
    }

    /**
     * Scope to filter by category.
     */
    public function scopeCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope to filter by type.
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to get unread notifications.
     */
    public function scopeUnread($query)
    {
        return $query->where('read', false);
    }

    /**
     * Scope to filter by reference model.
     */
    public function scopeForReference($query, $model)
    {
        return $query->where('reference_type', get_class($model))
                     ->where('reference_id', $model->id);
    }

    /**
     * Create a notification for a user with a reference.
     */
    public static function createForUser($userId, $type, $title, $message, $category = 'general', $reference = null, $data = null, $actionUrl = null)
    {
        return static::create([
            'user_id' => $userId,
            'type' => $type,
            'category' => $category,
            'title' => $title,
            'message' => $message,
            'reference_type' => $reference ? get_class($reference) : null,
            'reference_id' => $reference?->id,
            'data' => $data,
            'action_url' => $actionUrl,
        ]);
    }
}
