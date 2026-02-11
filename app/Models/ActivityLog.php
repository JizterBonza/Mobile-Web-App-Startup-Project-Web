<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class ActivityLog extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'activity_logs';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'action',
        'subject_type',
        'subject_id',
        'description',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
        'url',
        'request_method',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = ['subject_display_name'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get a human-readable name for the subject (resolved from subject_id + subject_type).
     *
     * @return string|null
     */
    public function getSubjectDisplayNameAttribute(): ?string
    {
        if (! $this->subject_type || ! $this->subject_id) {
            return null;
        }

        $subject = $this->relationLoaded('subject') ? $this->subject : $this->subject()->first();
        if (! $subject) {
            return class_basename($this->subject_type) . ' #' . $this->subject_id;
        }

        if ($subject instanceof User) {
            $detail = $subject->relationLoaded('userDetail') ? $subject->userDetail : $subject->userDetail;
            if ($detail) {
                $name = trim(($detail->first_name ?? '') . ' ' . ($detail->last_name ?? ''));
                return $name ?: ($detail->email ?? 'User #' . $subject->getKey());
            }
            return 'User #' . $subject->getKey();
        }

        foreach (['category_name', 'sub_category_name', 'name', 'shop_name', 'item_name', 'title'] as $attr) {
            if (isset($subject->{$attr})) {
                return (string) $subject->{$attr};
            }
        }

        return class_basename($subject) . ' #' . $subject->getKey();
    }

    /**
     * Get the user that performed the action (nullable for system actions).
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the subject of the activity (polymorphic).
     */
    public function subject()
    {
        return $this->morphTo();
    }

    /**
     * Scope by user.
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope by action.
     */
    public function scopeAction($query, $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope by subject type.
     */
    public function scopeSubjectType($query, $type)
    {
        return $query->where('subject_type', $type);
    }

    /**
     * Scope by date range.
     */
    public function scopeBetweenDates($query, $from, $to)
    {
        if ($from) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to) {
            $query->whereDate('created_at', '<=', $to);
        }
        return $query;
    }

    /**
     * Log an activity (helper for use across the app).
     *
     * @param string $action Action name (e.g. 'created', 'updated', 'deleted', 'login')
     * @param string|null $description Human-readable description
     * @param Model|null $subject Related model (optional)
     * @param array|null $oldValues Previous values (optional)
     * @param array|null $newValues New values (optional)
     * @return self
     */
    public static function log(
        string $action,
        ?string $description = null,
        ?Model $subject = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): self {
        $request = request();
        return static::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id' => $subject?->getKey(),
            'description' => $description,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'url' => $request?->fullUrl(),
            'request_method' => $request?->method(),
        ]);
    }
}
