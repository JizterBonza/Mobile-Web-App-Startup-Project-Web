<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class BreederPost extends Model
{
    use SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_PUBLISHED = 'published';

    public const MAX_IMAGES = 10;

    protected $fillable = ['breeder_id', 'title', 'body', 'status', 'published_at'];

    protected function casts(): array
    {
        return ['published_at' => 'datetime', 'is_liked' => 'boolean'];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'breeder_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(BreederPostImage::class)->orderBy('position');
    }

    public function likes(): HasMany
    {
        return $this->hasMany(BreederPostLike::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(BreederPostComment::class);
    }

    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PUBLISHED)
            ->whereNotNull('published_at')
            ->whereHas('author', fn (Builder $author) => $author
                ->where('status', User::STATUS_ACTIVE)->where('user_type', User::TYPE_BREEDER));
    }

    public function isPubliclyVisible(): bool
    {
        return ! $this->trashed() && $this->status === self::STATUS_PUBLISHED
            && $this->published_at !== null && $this->author?->isActive()
            && $this->author->user_type === User::TYPE_BREEDER;
    }
}
