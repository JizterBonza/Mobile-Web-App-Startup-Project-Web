<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KlasrumContent extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';

    protected $table = 'klasrum_contents';

    protected $fillable = [
        'title',
        'description',
        'heading',
        'body',
        'category_id',
        'caption',
        'cover_path',
        'media_path',
        'media_type',
        'status',
        'published_at',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'category_id' => 'integer',
            'published_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(KlasrumCategory::class, 'category_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function coverUrl(): ?string
    {
        if (! $this->cover_path) {
            return null;
        }

        return '/storage/' . ltrim($this->cover_path, '/');
    }

    public function mediaUrl(): ?string
    {
        if (! $this->media_path) {
            return null;
        }

        return '/storage/' . ltrim($this->media_path, '/');
    }

    public function isPublished(): bool
    {
        return $this->status === self::STATUS_PUBLISHED;
    }

    public function scopePublished($query)
    {
        return $query->where('status', self::STATUS_PUBLISHED);
    }

    /**
     * @return array<string, mixed>
     */
    public function toMobileListArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title ?: 'Untitled',
            'description' => $this->description,
            'heading' => $this->heading,
            'category_id' => $this->category_id,
            'category' => $this->category ? [
                'id' => $this->category->id,
                'name' => $this->category->name,
            ] : null,
            'cover_url' => $this->absoluteFileUrl($this->cover_path),
            'published_at' => $this->published_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toMobileDetailArray(): array
    {
        return [
            ...$this->toMobileListArray(),
            'body' => $this->body,
            'caption' => $this->caption,
            'media_url' => $this->absoluteFileUrl($this->media_path),
            'media_type' => $this->media_type,
        ];
    }

    private function absoluteFileUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return url('/storage/' . ltrim($path, '/'));
    }

    public function toListArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title ?: 'Untitled',
            'description' => $this->description,
            'category' => $this->category?->name,
            'status' => $this->status,
            'publishedAt' => $this->published_at?->format('F j, Y'),
        ];
    }

    public function toBuilderArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title ?? '',
            'description' => $this->description ?? '',
            'heading' => $this->heading ?? '',
            'body' => $this->body ?? '',
            'category_id' => $this->category_id,
            'category' => $this->category?->name ?? '',
            'caption' => $this->caption ?? '',
            'cover_url' => $this->coverUrl(),
            'media_url' => $this->mediaUrl(),
            'media_is_video' => $this->media_type === 'video',
            'status' => $this->status,
        ];
    }
}
