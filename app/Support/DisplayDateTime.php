<?php

namespace App\Support;

use Carbon\Carbon;
use DateTimeInterface;

class DisplayDateTime
{
    /**
     * Convert a stored app-timezone instant (UTC) to ISO-8601 with offset.
     */
    public static function toIso(mixed $value): ?string
    {
        return self::parse($value)?->toIso8601String();
    }

    public static function parse(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        $timezone = (string) config('app.timezone', 'UTC');

        if ($value instanceof Carbon) {
            return $value->copy()->timezone($timezone);
        }

        if ($value instanceof DateTimeInterface) {
            return Carbon::instance($value)->timezone($timezone);
        }

        return Carbon::parse((string) $value, $timezone);
    }
}
