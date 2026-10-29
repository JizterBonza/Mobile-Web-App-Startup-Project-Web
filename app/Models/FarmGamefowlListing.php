<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FarmGamefowlListing extends Model
{
    protected $fillable = [
        'farm_id',
        'gamefowl_catalog_id',
        'is_bundle',
        'bundle_name',
        'bundle_type',
        'bundle_catalog_ids',
        'price',
        'selling_unit',
        'stock',
        'release_option',
        'release_date',
        'popularity',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'is_bundle' => 'boolean',
            'bundle_catalog_ids' => 'array',
            'price' => 'float',
            'stock' => 'integer',
            'reserved_stock' => 'integer',
            'popularity' => 'integer',
            'release_date' => 'date',
        ];
    }

    public function farm()
    {
        return $this->belongsTo(Farm::class);
    }

    public function gamefowl()
    {
        return $this->belongsTo(GamefowlCatalog::class, 'gamefowl_catalog_id');
    }
}
