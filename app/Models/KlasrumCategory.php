<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KlasrumCategory extends Model
{
    protected $table = 'klasrum_categories';

    protected $fillable = [
        'name',
    ];

    public function contents(): HasMany
    {
        return $this->hasMany(KlasrumContent::class, 'category_id');
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    public static function options(): array
    {
        return static::query()
            ->orderBy('name')
            ->get()
            ->map(fn (self $category) => [
                'id' => $category->id,
                'name' => $category->name,
            ])
            ->all();
    }
}
