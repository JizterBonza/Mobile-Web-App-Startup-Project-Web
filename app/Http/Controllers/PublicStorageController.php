<?php

namespace App\Http\Controllers;

use App\Support\PublicStorage;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class PublicStorageController extends Controller
{
    /**
     * Stream a public-disk file when the public/storage symlink is missing
     * (common on hosted environments) so uploaded images still load.
     */
    public function show(string $path): Response
    {
        $relative = PublicStorage::relativePath($path);

        if (! is_string($relative) || $relative === '') {
            abort(404);
        }

        $disk = Storage::disk('public');

        abort_unless($disk->exists($relative), 404);

        return $disk->response($relative, null, [
            'Cache-Control' => 'public, max-age=604800, immutable',
        ]);
    }
}
