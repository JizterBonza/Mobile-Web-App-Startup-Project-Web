<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class GamefowlLookup extends Model
{
    public const TYPE_BLOODLINE = 'bloodline';

    public const TYPE_AGE = 'age_type';

    public const TYPE_CLASS = 'class';

    public const RATES_CACHE_KEY = 'gamefowl_bloodline_rates';

    public const RATES_CACHE_TTL = 600;

    /**
     * Bloodline markup rates (percent) keyed by lookup id.
     *
     * @return array<int, float>
     */
    public static function bloodlineRates(): array
    {
        return Cache::remember(self::RATES_CACHE_KEY, self::RATES_CACHE_TTL, function () {
            return static::query()
                ->where('type', self::TYPE_BLOODLINE)
                ->whereNotNull('rate')
                ->pluck('rate', 'id')
                ->mapWithKeys(fn ($rate, $id) => [(int) $id => max(0.0, (float) $rate)])
                ->all();
        });
    }

    public static function flushRatesCache(): void
    {
        Cache::forget(self::RATES_CACHE_KEY);
    }

    protected $fillable = [
        'type',
        'name',
        'description',
        'rate',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:2',
        ];
    }

    public function rateLogs()
    {
        return $this->hasMany(GamefowlLookupRateLog::class)->orderByDesc('created_at');
    }
}
