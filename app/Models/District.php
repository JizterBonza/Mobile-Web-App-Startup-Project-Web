<?php

namespace App\Models;

use App\Models\Concerns\HasMapBoundary;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class District extends Model
{
    use HasFactory, HasMapBoundary;

    protected $table = 'districts';

    protected $fillable = [
        'name',
        'description',
        'boundary',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'boundary' => 'array',
            'status' => 'boolean',
        ];
    }

    /**
     * Zones that belong to this district.
     */
    public function zones()
    {
        return $this->hasMany(Zone::class);
    }

    /**
     * Find the first active district whose boundary contains the given point.
     */
    public static function findDistrictContainingPoint(?float $lat, ?float $lng): ?self
    {
        return static::findActiveContainingPoint($lat, $lng);
    }
}
