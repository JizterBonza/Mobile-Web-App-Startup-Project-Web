<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KlasrumContent extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';

    public const CATEGORIES = ['Health', 'Nutrition', 'Training', 'News', 'General'];

    protected $table = 'klasrum_contents';

    protected $fillable = [
        'title',
        'description',
        'heading',
        'body',
        'category',
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
            'published_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
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

    public function toListArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title ?: 'Untitled',
            'description' => $this->description,
            'category' => $this->category,
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
            'category' => $this->category ?? '',
            'caption' => $this->caption ?? '',
            'cover_url' => $this->coverUrl(),
            'media_url' => $this->mediaUrl(),
            'media_is_video' => $this->media_type === 'video',
            'status' => $this->status,
        ];
    }
}
