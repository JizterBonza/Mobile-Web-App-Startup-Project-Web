<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Category extends Model
{
    use HasFactory;

    const RATES_CACHE_KEY = 'category_rates';

    const RATES_CACHE_TTL = 600;

    /**
     * Markup rates (percent) keyed by category id.
     *
     * @return array<int, float>
     */
    public static function rates(): array
    {
        return Cache::remember(self::RATES_CACHE_KEY, self::RATES_CACHE_TTL, function () {
            return static::query()
                ->whereNotNull('category_rate')
                ->pluck('category_rate', 'id')
                ->map(fn ($rate) => (float) $rate)
                ->all();
        });
    }

    public static function flushRatesCache(): void
    {
        Cache::forget(self::RATES_CACHE_KEY);
    }

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'category';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'category_name',
        'category_description',
        'category_image_url',
        'category_rate',
        'status',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'category_rate' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the items that belong to this category.
     */
    public function items()
    {
        return $this->hasMany(Item::class, 'category');
    }

    /**
     * Get rate change history for this category.
     */
    public function rateLogs()
    {
        return $this->hasMany(CategoryRateLog::class)->orderByDesc('created_at');
    }
}

