<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class StoreSchedule
{
    public const DAYS = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
    ];

    /**
     * @return array<string, string>
     */
    public static function rules(): array
    {
        return [
            'half_day' => 'nullable|string|in:'.implode(',', self::DAYS),
            'half_day_opening' => 'nullable|date_format:H:i',
            'half_day_closing' => 'nullable|date_format:H:i',
        ];
    }

    /**
     * Encode an optional shorter day as "Sunday|06:00|08:00".
     *
     * @param  array<string, mixed>  $input
     */
    public static function encode(array $input, string $operatingDays): ?string
    {
        $day = trim((string) ($input['half_day'] ?? ''));
        $opening = self::normalizeTime($input['half_day_opening'] ?? null);
        $closing = self::normalizeTime($input['half_day_closing'] ?? null);

        if ($day === '' && $opening === null && $closing === null) {
            return null;
        }

        if ($day === '' || $opening === null || $closing === null) {
            throw ValidationException::withMessages([
                'half_day' => 'Choose a day and both times for the half-day schedule.',
            ]);
        }

        if (! in_array($day, self::parseDays($operatingDays), true)) {
            throw ValidationException::withMessages([
                'half_day' => 'The half-day must be one of the store operating days.',
            ]);
        }

        if ($opening >= $closing) {
            throw ValidationException::withMessages([
                'half_day_closing' => 'Half-day closing time must be after the opening time.',
            ]);
        }

        return $day.'|'.$opening.'|'.$closing;
    }

    /**
     * @return array<int, string>
     */
    public static function parseDays(string $value): array
    {
        $value = trim($value);
        if ($value === '') {
            return [];
        }

        if (preg_match('/^([A-Za-z]+)\s*-\s*([A-Za-z]+)$/', $value, $matches)) {
            $start = array_search($matches[1], self::DAYS, true);
            $end = array_search($matches[2], self::DAYS, true);
            if ($start !== false && $end !== false && $start <= $end) {
                return array_slice(self::DAYS, $start, $end - $start + 1);
            }
        }

        return array_values(array_filter(
            array_map('trim', explode(',', $value)),
            fn ($day) => in_array($day, self::DAYS, true)
        ));
    }

    public static function label(?string $encoded): ?string
    {
        if ($encoded === null || trim($encoded) === '') {
            return null;
        }

        $parts = explode('|', $encoded);
        if (count($parts) !== 3 || ! in_array($parts[0], self::DAYS, true)) {
            return null;
        }

        $opening = self::normalizeTime($parts[1]);
        $closing = self::normalizeTime($parts[2]);
        if ($opening === null || $closing === null) {
            return null;
        }

        $short = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][array_search($parts[0], self::DAYS, true)];

        return $short.' '.self::formatClock($opening).' - '.self::formatClock($closing);
    }

    private static function normalizeTime(mixed $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '' || ! preg_match('/^(\d{1,2}):(\d{2})/', $value, $matches)) {
            return null;
        }

        $hours = (int) $matches[1];
        if ($hours > 23) {
            return null;
        }

        return sprintf('%02d:%s', $hours, $matches[2]);
    }

    private static function formatClock(string $time): string
    {
        [$hours, $minutes] = array_map('intval', explode(':', $time));
        $period = $hours >= 12 ? 'PM' : 'AM';
        $display = $hours % 12 === 0 ? 12 : $hours % 12;

        return $display.':'.str_pad((string) $minutes, 2, '0', STR_PAD_LEFT).' '.$period;
    }
};
