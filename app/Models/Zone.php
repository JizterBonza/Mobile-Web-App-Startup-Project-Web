<?php

namespace App\Models;

use App\Models\Concerns\HasMapBoundary;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Zone extends Model
{
    use HasFactory, HasMapBoundary;

    protected $table = 'zones';

    protected $fillable = [
        'district_id',
        'name',
        'description',
        'boundary',
        'is_cod',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'boundary' => 'array',
            'is_cod' => 'boolean',
            'status' => 'boolean',
        ];
    }

    /**
     * District this zone belongs to.
     */
    public function district()
    {
        return $this->belongsTo(District::class);
    }

    /**
     * Get the shops located in this zone.
     */
    public function shops()
    {
        return $this->hasMany(Shop::class);
    }

    /**
     * Find the first active zone whose boundary contains the given point.
     * Returns the Zone model or null if none found.
     */
    public static function findZoneContainingPoint(?float $lat, ?float $lng): ?self
    {
        return static::findActiveContainingPoint($lat, $lng);
    }
}
