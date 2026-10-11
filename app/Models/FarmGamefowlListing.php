<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FarmGamefowlListing extends Model
{
    protected $fillable = [
        'farm_id',
        'gamefowl_catalog_id',
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
            'price' => 'float',
            'stock' => 'integer',
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
