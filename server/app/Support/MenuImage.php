<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

final class MenuImage
{
    public static function store(UploadedFile $file): string
    {
        $path = $file->store('menu', 'public');

        return Storage::disk('public')->url($path);
    }

    public static function deleteIfOwned(?string $imageUrl): void
    {
        if ($imageUrl === null || $imageUrl === '') {
            return;
        }

        $path = self::publicDiskPath($imageUrl);
        if ($path === null) {
            return;
        }

        Storage::disk('public')->delete($path);
    }

    public static function resolve(?string $imageUrl): ?string
    {
        if ($imageUrl === null || $imageUrl === '') {
            return null;
        }

        if (str_starts_with($imageUrl, 'http://') || str_starts_with($imageUrl, 'https://')) {
            return $imageUrl;
        }

        if (str_starts_with($imageUrl, '/storage/')) {
            return rtrim((string) config('app.url'), '/').$imageUrl;
        }

        return $imageUrl;
    }

    private static function publicDiskPath(string $imageUrl): ?string
    {
        $path = parse_url($imageUrl, PHP_URL_PATH);
        if (! is_string($path) || $path === '') {
            $path = $imageUrl;
        }

        $marker = '/storage/';
        $pos = strpos($path, $marker);
        if ($pos === false) {
            return null;
        }

        return ltrim(substr($path, $pos + strlen($marker)), '/');
    }
}
