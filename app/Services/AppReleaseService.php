<?php

namespace App\Services;

use App\Models\AppRelease;
use App\Models\AppReleaseDownload;
use App\Models\User;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class AppReleaseService
{
    const DOWNLOAD_URL_TTL_MINUTES = 10;

    public function diskName(): string
    {
        return (string) config('filesystems.app_releases_disk', 's3');
    }

    public function disk(?string $name = null): Filesystem
    {
        return Storage::disk($name ?? $this->diskName());
    }

    public function store(UploadedFile $file, array $data, User $uploader): AppRelease
    {
        $appKey = $data['app_key'] ?? AppRelease::DEFAULT_APP_KEY;
        $platform = $data['platform'] ?? AppRelease::DEFAULT_PLATFORM;
        $channel = $data['channel'] ?? AppRelease::CHANNEL_STAGING;
        $versionName = trim($data['version_name']);
        $versionCode = (int) $data['version_code'];

        $checksum = hash_file('sha256', $file->getRealPath());
        $safeVersion = preg_replace('/[^A-Za-z0-9._-]/', '_', $versionName);
        $directory = "apks/{$appKey}";
        $filename = "{$safeVersion}-{$versionCode}.apk";
        $diskName = $this->diskName();

        $storedPath = $this->disk($diskName)->putFileAs($directory, $file, $filename);
        if (! $storedPath) {
            throw new RuntimeException('The APK could not be uploaded to storage.');
        }

        try {
            return DB::transaction(function () use ($data, $file, $uploader, $appKey, $platform, $channel, $versionName, $versionCode, $checksum, $storedPath, $diskName) {
                $isProduction = $channel === AppRelease::CHANNEL_PRODUCTION;

                if ($isProduction) {
                    $this->archiveCurrentLive($appKey, $platform);
                }

                return AppRelease::create([
                    'app_key' => $appKey,
                    'platform' => $platform,
                    'version_name' => $versionName,
                    'version_code' => $versionCode,
                    'release_notes' => $data['release_notes'] ?? null,
                    'storage_disk' => $diskName,
                    'storage_path' => $storedPath,
                    'original_filename' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize(),
                    'checksum_sha256' => $checksum,
                    'mime_type' => 'application/vnd.android.package-archive',
                    'status' => $isProduction ? AppRelease::STATUS_LIVE : AppRelease::STATUS_STAGING,
                    'channel' => $channel,
                    'is_force_update' => (bool) ($data['is_force_update'] ?? false),
                    'min_supported_version_code' => $data['min_supported_version_code'] ?? null,
                    'rollout_percentage' => 100,
                    'uploaded_by' => $uploader->id,
                    'published_at' => $isProduction ? now() : null,
                ]);
            });
        } catch (Throwable $e) {
            $this->disk($diskName)->delete($storedPath);
            throw $e;
        }
    }

    public function publish(AppRelease $release): AppRelease
    {
        if ($release->status === AppRelease::STATUS_LIVE) {
            throw ValidationException::withMessages(['release' => 'This release is already live.']);
        }

        return DB::transaction(function () use ($release) {
            $this->archiveCurrentLive($release->app_key, $release->platform, $release->id);

            $release->update([
                'status' => AppRelease::STATUS_LIVE,
                'channel' => AppRelease::CHANNEL_PRODUCTION,
                'published_at' => now(),
            ]);

            return $release;
        });
    }

    public function archive(AppRelease $release): AppRelease
    {
        $release->update(['status' => AppRelease::STATUS_ARCHIVED]);

        return $release;
    }

    public function delete(AppRelease $release): void
    {
        if ($release->status === AppRelease::STATUS_LIVE) {
            throw ValidationException::withMessages([
                'release' => 'The live release cannot be deleted. Promote another build or archive it first.',
            ]);
        }

        $release->delete();
        $this->disk($release->storage_disk)->delete($release->storage_path);
    }

    /**
     * Production clients only see live builds; staging clients see the newest of staging or live builds.
     */
    public function latestFor(string $appKey, string $platform, string $channel = AppRelease::CHANNEL_PRODUCTION): ?AppRelease
    {
        $statuses = $channel === AppRelease::CHANNEL_STAGING
            ? [AppRelease::STATUS_STAGING, AppRelease::STATUS_LIVE]
            : [AppRelease::STATUS_LIVE];

        return AppRelease::forApp($appKey, $platform)
            ->whereIn('status', $statuses)
            ->orderByDesc('version_code')
            ->first();
    }

    public function maxVersionCode(string $appKey, string $platform): int
    {
        return (int) AppRelease::withTrashed()->forApp($appKey, $platform)->max('version_code');
    }

    public function temporaryUrl(AppRelease $release): string
    {
        return $this->disk($release->storage_disk)->temporaryUrl(
            $release->storage_path,
            now()->addMinutes(self::DOWNLOAD_URL_TTL_MINUTES),
            [
                'ResponseContentType' => $release->mime_type,
                'ResponseContentDisposition' => 'attachment; filename="'.addslashes($release->original_filename).'"',
            ],
        );
    }

    public function recordDownload(AppRelease $release, Request $request): void
    {
        DB::transaction(function () use ($release, $request) {
            AppReleaseDownload::create([
                'app_release_id' => $release->id,
                'user_id' => $request->user('sanctum')?->id,
                'ip_address' => $request->ip(),
                'device_info' => mb_substr((string) $request->userAgent(), 0, 255) ?: null,
                'created_at' => now(),
            ]);

            $release->increment('download_count');
        });
    }

    public function stats(string $appKey = AppRelease::DEFAULT_APP_KEY, string $platform = AppRelease::DEFAULT_PLATFORM): array
    {
        $live = AppRelease::forApp($appKey, $platform)->live()->orderByDesc('version_code')->first();
        $releaseIds = AppRelease::withTrashed()->forApp($appKey, $platform)->pluck('id');

        $downloadsQuery = fn () => AppReleaseDownload::whereIn('app_release_id', $releaseIds);
        $last30 = $downloadsQuery()->where('created_at', '>=', now()->subDays(30))->count();
        $liveLast30 = $live
            ? $downloadsQuery()->where('app_release_id', $live->id)->where('created_at', '>=', now()->subDays(30))->count()
            : 0;

        $minSupported = $live?->min_supported_version_code;
        $minSupportedName = $minSupported
            ? AppRelease::withTrashed()->forApp($appKey, $platform)->where('version_code', $minSupported)->value('version_name')
            : null;

        return [
            'live' => $live ? [
                'id' => $live->id,
                'version_name' => $live->version_name,
                'version_code' => $live->version_code,
            ] : null,
            'total_downloads' => (int) AppRelease::forApp($appKey, $platform)->sum('download_count'),
            'downloads_last_7_days' => $downloadsQuery()->where('created_at', '>=', now()->subDays(7))->count(),
            'latest_download_share' => $last30 > 0 ? (int) round($liveLast30 / $last30 * 100) : null,
            'force_update' => (bool) $live?->is_force_update,
            'min_supported_version_code' => $minSupported,
            'min_supported_version_name' => $minSupportedName,
            'next_version_code' => $this->maxVersionCode($appKey, $platform) + 1,
        ];
    }

    private function archiveCurrentLive(string $appKey, string $platform, ?int $exceptId = null): void
    {
        AppRelease::forApp($appKey, $platform)
            ->live()
            ->when($exceptId, fn ($q) => $q->whereKeyNot($exceptId))
            ->lockForUpdate()
            ->get()
            ->each(fn (AppRelease $r) => $r->update(['status' => AppRelease::STATUS_ARCHIVED]));
    }
}
