<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAppReleaseRequest;
use App\Models\AppRelease;
use App\Services\AppReleaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class AppReleaseController extends Controller
{
    public function __construct(private AppReleaseService $releases)
    {
    }

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $releases = AppRelease::forApp()
            ->with('uploader.userDetail')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('version_name', 'like', "%{$search}%")
                        ->orWhere('version_code', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%")
                        ->orWhere('channel', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('version_code')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (AppRelease $release) => [
                'id' => $release->id,
                'version_name' => $release->version_name,
                'version_code' => $release->version_code,
                'release_notes' => $release->release_notes,
                'status' => $release->status,
                'channel' => $release->channel,
                'is_force_update' => $release->is_force_update,
                'min_supported_version_code' => $release->min_supported_version_code,
                'file_size' => $release->file_size,
                'original_filename' => $release->original_filename,
                'checksum_sha256' => $release->checksum_sha256,
                'download_count' => $release->download_count,
                'uploaded_by' => $this->uploaderName($release),
                'published_at' => $release->published_at?->toIso8601String(),
                'created_at' => $release->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Dashboard/ApkManagement', [
            'releases' => $releases,
            'stats' => $this->releases->stats(),
            'filters' => ['search' => $search],
            'uploadLimitBytes' => $this->serverUploadLimitBytes(),
        ]);
    }

    public function store(StoreAppReleaseRequest $request): RedirectResponse
    {
        // Large APKs can take longer than PHP's default limit to stream to S3.
        @set_time_limit(600);

        try {
            $release = $this->releases->store($request->file('apk'), $request->validated(), $request->user());
        } catch (Throwable $e) {
            report($e);

            $message = 'The APK could not be saved. Please try again.';
            if (config('app.debug')) {
                $message .= ' ('.class_basename($e).': '.Str::limit($e->getPrevious()?->getMessage() ?: $e->getMessage(), 300).')';
            }

            return back()->with('error', $message);
        }

        $where = $release->status === AppRelease::STATUS_LIVE ? 'is now live in production' : 'was uploaded to staging';

        return back()->with('success', "v{$release->version_name} (build {$release->version_code}) {$where}.");
    }

    public function publish(AppRelease $release): RedirectResponse
    {
        $this->releases->publish($release);

        return back()->with('success', "v{$release->version_name} is now live in production.");
    }

    public function archive(AppRelease $release): RedirectResponse
    {
        $this->releases->archive($release);

        return back()->with('success', "v{$release->version_name} was archived.");
    }

    public function destroy(AppRelease $release): RedirectResponse
    {
        $this->releases->delete($release);

        return back()->with('success', "v{$release->version_name} was deleted.");
    }

    public function download(AppRelease $release): RedirectResponse
    {
        try {
            return redirect()->away($this->releases->temporaryUrl($release));
        } catch (Throwable $e) {
            report($e);

            return back()->with('error', 'A download link could not be created for this release.');
        }
    }

    private function serverUploadLimitBytes(): ?int
    {
        $limits = array_filter([
            $this->iniBytes(ini_get('upload_max_filesize')),
            $this->iniBytes(ini_get('post_max_size')),
        ]);

        return $limits ? min($limits) : null;
    }

    private function iniBytes(string|false $value): ?int
    {
        $value = trim((string) $value);
        if ($value === '' || $value === '0' || $value === '-1') {
            return null;
        }

        $number = (int) $value;

        return match (strtolower(substr($value, -1))) {
            'g' => $number * 1024 ** 3,
            'm' => $number * 1024 ** 2,
            'k' => $number * 1024,
            default => $number,
        };
    }

    private function uploaderName(AppRelease $release): ?string
    {
        $detail = $release->uploader?->userDetail;
        if (! $detail) {
            return null;
        }

        return trim("{$detail->first_name} {$detail->last_name}") ?: null;
    }
}
