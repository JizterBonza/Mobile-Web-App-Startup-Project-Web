<?php

namespace App\Support;

class PublicStorage
{
    /**
     * Build a same-origin URL for a file on the public disk.
     *
     * Absolute APP_URL / localhost storage links are rewritten to /storage/...
     * so images keep working when the app is served from a different host.
     * External URLs (S3, Google avatars, Unsplash) are left unchanged.
     */
    public static function url(?string $path): ?string
    {
        if ($path === null) {
            return null;
        }

        $path = trim(str_replace('\\', '/', $path));
        if ($path === '') {
            return null;
        }

        $relative = self::relativePath($path);
        if ($relative === null) {
            return $path;
        }

        if ($relative === '') {
            return null;
        }

        return '/storage/'.$relative;
    }

    /**
     * Public-disk relative path, or null when $path is an external non-storage URL.
     */
    public static function relativePath(string $path): ?string
    {
        $path = trim(str_replace('\\', '/', $path));
        if ($path === '') {
            return '';
        }

        if (preg_match('#^https?://#i', $path)) {
            $urlPath = parse_url($path, PHP_URL_PATH) ?: '';
            if (! str_contains($urlPath, '/storage/')) {
                return null;
            }
            $path = $urlPath;
        }

        if (str_starts_with($path, '/storage/')) {
            $path = substr($path, strlen('/storage/'));
        } elseif (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        } else {
            $path = ltrim($path, '/');
        }

        $path = ltrim($path, '/');
        if ($path === '' || str_contains($path, '..')) {
            return '';
        }

        return $path;
    }
}
