<?php

namespace App\Models;

use App\Support\PublicStorage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KlasrumContent extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';
    public const MAX_MEDIA_ITEMS = 15;

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
        'media_items',
        'status',
        'published_at',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'category_id' => 'integer',
            'media_items' => 'array',
            'published_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(KlasrumCategory::class, 'category_id')->withTrashed();
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
        return PublicStorage::url($this->cover_path);
    }

    public function mediaUrl(): ?string
    {
        $first = $this->normalizedMediaItems()[0] ?? null;

        return PublicStorage::url($first['path'] ?? $this->media_path);
    }

    /**
     * @return list<array{path: string, type: string}>
     */
    public function normalizedMediaItems(): array
    {
        $items = $this->media_items;
        if (is_string($items)) {
            $decoded = json_decode($items, true);
            $items = is_array($decoded) ? $decoded : [];
        }
        if (! is_array($items)) {
            $items = [];
        }

        $normalized = [];
        foreach ($items as $item) {
            if (is_string($item) && $item !== '') {
                $normalized[] = [
                    'path' => $item,
                    'type' => 'image',
                ];
                continue;
            }
            if (! is_array($item)) {
                continue;
            }
            $path = $item['path'] ?? null;
            if (! is_string($path) || $path === '') {
                continue;
            }
            $normalized[] = [
                'path' => $path,
                'type' => ($item['type'] ?? 'image') === 'video' ? 'video' : 'image',
            ];
        }

        if ($normalized === [] && $this->media_items === null && $this->media_path) {
            return [[
                'path' => $this->media_path,
                'type' => $this->media_type === 'video' ? 'video' : 'image',
            ]];
        }

        return array_values($normalized);
    }

    /**
     * @return list<array{path: string, url: ?string, type: string, is_video: bool}>
     */
    public function mediaPayload(bool $absolute = true): array
    {
        return array_map(fn (array $item) => [
            'path' => $item['path'],
            'url' => $absolute
                ? $this->absoluteFileUrl($item['path'])
                : PublicStorage::url($item['path']),
            'type' => $item['type'],
            'is_video' => $item['type'] === 'video',
        ], $this->normalizedMediaItems());
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
            'media' => $this->mediaPayload(),
            'media_url' => $this->absoluteFileUrl($this->normalizedMediaItems()[0]['path'] ?? $this->media_path),
            'media_type' => $this->normalizedMediaItems()[0]['type'] ?? $this->media_type,
        ];
    }

    private function absoluteFileUrl(?string $path): ?string
    {
        $relative = PublicStorage::url($path);
        if (! $relative) {
            return null;
        }

        if (preg_match('#^https?://#i', $relative)) {
            return $relative;
        }

        $root = request()?->getSchemeAndHttpHost();
        if (! $root) {
            return url($relative);
        }

        return rtrim($root, '/').$relative;
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
            'media' => $this->mediaPayload(false),
            'media_url' => $this->mediaUrl(),
            'media_is_video' => ($this->normalizedMediaItems()[0]['type'] ?? $this->media_type) === 'video',
            'status' => $this->status,
        ];
    }
}
