<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AppRelease extends Model
{
    use SoftDeletes;

    const STATUS_DRAFT = 'draft';
    const STATUS_STAGING = 'staging';
    const STATUS_LIVE = 'live';
    const STATUS_ARCHIVED = 'archived';

    const CHANNEL_STAGING = 'staging';
    const CHANNEL_PRODUCTION = 'production';

    const DEFAULT_APP_KEY = 'klasmeyt-mobile';
    const DEFAULT_PLATFORM = 'android';

    protected $fillable = [
        'app_key',
        'platform',
        'version_name',
        'version_code',
        'release_notes',
        'storage_disk',
        'storage_path',
        'original_filename',
        'file_size',
        'checksum_sha256',
        'mime_type',
        'status',
        'channel',
        'is_force_update',
        'min_supported_version_code',
        'rollout_percentage',
        'uploaded_by',
        'published_at',
        'download_count',
    ];

    protected $casts = [
        'version_code' => 'integer',
        'file_size' => 'integer',
        'is_force_update' => 'boolean',
        'min_supported_version_code' => 'integer',
        'rollout_percentage' => 'integer',
        'download_count' => 'integer',
        'published_at' => 'datetime',
    ];

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function downloads(): HasMany
    {
        return $this->hasMany(AppReleaseDownload::class);
    }

    public function scopeForApp(Builder $query, string $appKey = self::DEFAULT_APP_KEY, string $platform = self::DEFAULT_PLATFORM): Builder
    {
        return $query->where('app_key', $appKey)->where('platform', $platform);
    }

    public function scopeLive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_LIVE);
    }

    public function isDownloadable(): bool
    {
        return in_array($this->status, [self::STATUS_LIVE, self::STATUS_STAGING], true);
    }
}
