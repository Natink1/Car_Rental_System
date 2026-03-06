<?php

namespace App\Helpers;

use Spatie\MediaLibrary\MediaCollections\Models\Media;

class MediaUrlHelper
{
    /**
     * Return full URL for media so it works when APP_URL has wrong port (e.g. http://localhost vs http://localhost:8000).
     */
    public static function fullUrl(?Media $media): ?string
    {
        if (! $media) {
            return null;
        }

        $url = $media->getFullUrl();
        $host = request()->getSchemeAndHttpHost();

        if (! $host) {
            return $url;
        }

        // If URL is absolute but wrong host, replace with current request host
        if (preg_match('#^https?://#', $url)) {
            return preg_replace('#^https?://[^/]+#', $host, $url);
        }

        // If URL is relative, prepend request host
        if (str_starts_with($url, '/')) {
            return $host . $url;
        }

        return $url;
    }
}
