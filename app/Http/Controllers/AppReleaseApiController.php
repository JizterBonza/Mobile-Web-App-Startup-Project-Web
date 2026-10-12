<?php

namespace App\Http\Controllers;

use App\Models\AppRelease;
use App\Services\AppReleaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AppReleaseApiController extends Controller
{
    public function __construct(private AppReleaseService $releases)
    {
    }

    public function latest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'app_key' => ['nullable', 'string', 'max:50'],
            'platform' => ['nullable', Rule::in(['android'])],
            'version_code' => ['nullable', 'integer', 'min:0'],
            'channel' => ['nullable', Rule::in([AppRelease::CHANNEL_STAGING, AppRelease::CHANNEL_PRODUCTION])],
        ]);

        $currentCode = isset($validated['version_code']) ? (int) $validated['version_code'] : null;
        $latest = $this->releases->latestFor(
            $validated['app_key'] ?? AppRelease::DEFAULT_APP_KEY,
            $validated['platform'] ?? AppRelease::DEFAULT_PLATFORM,
            $validated['channel'] ?? AppRelease::CHANNEL_PRODUCTION,
        );

        if (! $latest) {
            return response()->json([
                'success' => true,
                'update_available' => false,
                'force_update' => false,
                'latest' => null,
            ]);
        }

        $updateAvailable = $currentCode === null || $latest->version_code > $currentCode;
        $belowMinimum = $currentCode !== null
            && $latest->min_supported_version_code !== null
            && $currentCode < $latest->min_supported_version_code;
        $forceUpdate = $currentCode !== null && $updateAvailable && ($latest->is_force_update || $belowMinimum);

        return response()->json([
            'success' => true,
            'update_available' => $updateAvailable,
            'force_update' => $forceUpdate,
            'latest' => [
                'id' => $latest->id,
                'version_name' => $latest->version_name,
                'version_code' => $latest->version_code,
                'release_notes' => $latest->release_notes,
                'file_size' => $latest->file_size,
                'checksum_sha256' => $latest->checksum_sha256,
                'min_supported_version_code' => $latest->min_supported_version_code,
                'published_at' => $latest->published_at?->toIso8601String(),
                'download_url' => route('api.app-releases.download', $latest),
            ],
        ]);
    }

    public function download(Request $request, AppRelease $release): RedirectResponse|JsonResponse
    {
        if (! $release->isDownloadable()) {
            return response()->json(['success' => false, 'message' => 'This release is not available.'], 404);
        }

        $url = $this->releases->temporaryUrl($release);
        $this->releases->recordDownload($release, $request);

        return redirect()->away($url);
    }
}
