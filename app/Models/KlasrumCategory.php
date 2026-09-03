<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class KlasrumCategory extends Model
{
    use SoftDeletes;

    protected $table = 'klasrum_categories';

    protected $fillable = [
        'name',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'integer',
            'deleted_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $category) {
            if ($category->active === null) {
                $category->active = 1;
            }
        });

        static::deleting(function (self $category) {
            if ($category->active !== 0) {
                $category->active = 0;
                $category->saveQuietly();
            }
        });

        static::restoring(function (self $category) {
            $category->active = 1;
        });
    }

    public function contents(): HasMany
    {
        return $this->hasMany(KlasrumContent::class, 'category_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', 1);
    }

    /**
     * @return list<array{id: int, name: string, contents_count: int}>
     */
    public static function options(?int $includeId = null): array
    {
        $query = static::query()
            ->withCount('contents')
            ->where('active', 1);

        if ($includeId) {
            $query = static::withTrashed()
                ->withCount('contents')
                ->where(function (Builder $builder) use ($includeId) {
                    $builder->where('active', 1)->orWhere('id', $includeId);
                });
        }

        return $query
            ->orderBy('name')
            ->get()
            ->map(fn (self $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'contents_count' => $category->contents_count,
            ])
            ->all();
    }
}
