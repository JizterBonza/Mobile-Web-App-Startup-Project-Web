<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HandlingFeeSetting extends Model
{
    use HasFactory;

    const STATUS_ACTIVE = 'active';
    const STATUS_ARCHIVED = 'archived';
    const STATUS_DRAFT = 'draft';

    /**
     * Cache key for the current active row.
     */
    const CACHE_KEY = 'handling_fee_settings:active';

    /**
     * Cache TTL in seconds for the active row lookup.
     */
    const CACHE_TTL = 600;

    protected $fillable = [
        'free_until_kg',
        'base_fee',
        'increment_threshold_kg',
        'increment_block_kg',
        'increment_fee_per_block',
        'max_fee',
        'status',
        'note',
    ];

    protected $casts = [
        'free_until_kg' => 'decimal:3',
        'base_fee' => 'decimal:2',
        'increment_threshold_kg' => 'decimal:3',
        'increment_block_kg' => 'decimal:3',
        'increment_fee_per_block' => 'decimal:2',
        'max_fee' => 'decimal:2',
    ];

    /**
     * Scope a query to only include the active configuration row.
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Resolve the currently active configuration, cached to avoid a DB hit per request.
     */
    public static function getActive(): ?self
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return static::active()->orderByDesc('updated_at')->first();
        });
    }

    /**
     * Invalidate the cached active row. Call after any activation change.
     */
    public static function flushCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Promote this row to `active`, archiving any other active rows atomically.
     * Enforces the "only one active row at a time" invariant at the application level.
     */
    public function activate(?string $note = null): self
    {
        DB::transaction(function () use ($note) {
            static::active()
                ->where('id', '!=', $this->id)
                ->update(['status' => self::STATUS_ARCHIVED]);

            $this->status = self::STATUS_ACTIVE;
            if ($note !== null) {
                $this->note = $note;
            }
            $this->save();
        });

        static::flushCache();

        return $this->fresh();
    }

    /**
     * Boot hook to keep the cache in sync when rows change.
     */
    protected static function booted(): void
    {
        $flush = function (self $row) {
            if ($row->status === self::STATUS_ACTIVE || $row->isDirty('status')) {
                static::flushCache();
            }
        };

        static::saved($flush);
        static::deleted($flush);
    }
}
