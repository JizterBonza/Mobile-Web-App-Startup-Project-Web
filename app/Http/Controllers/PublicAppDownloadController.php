<?php

namespace App\Http\Controllers;

use App\Models\AppRelease;
use App\Services\AppReleaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Throwable;

class PublicAppDownloadController extends Controller
{
    public function __construct(private AppReleaseService $releases)
    {
    }

    public function android(Request $request): RedirectResponse|Response
    {
        $headers = ['Cache-Control' => 'no-store, private'];

        try {
            $release = $this->releases->latestFor(
                AppRelease::DEFAULT_APP_KEY,
                AppRelease::DEFAULT_PLATFORM,
                AppRelease::CHANNEL_PRODUCTION,
            );

            if (! $release) {
                return response('The Android app is not available for download yet.', 404, $headers + [
                    'Content-Type' => 'text/plain; charset=UTF-8',
                ]);
            }

            $url = $this->releases->temporaryUrl($release);
            $this->releases->recordDownload($release, $request);

            return redirect()->away($url, 302, $headers);
        } catch (Throwable $e) {
            report($e);

            return response('The download is temporarily unavailable. Please try again later.', 503, $headers + [
                'Content-Type' => 'text/plain; charset=UTF-8',
            ]);
        }
    }
}
