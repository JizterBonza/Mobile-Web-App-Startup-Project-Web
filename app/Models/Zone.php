<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Zone extends Model
{
    use HasFactory;

    protected $table = 'zones';

    protected $fillable = [
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
     * Get the shops located in this zone.
     */
    public function shops()
    {
        return $this->hasMany(Shop::class);
    }

    /**
     * Check if the given point (lat, lng) lies inside this zone's boundary polygon.
     * Uses ray-casting (horizontal ray to the right); boundary is array of { lat, lng }.
     */
    public function containsPoint(float $lat, float $lng): bool
    {
        $boundary = $this->boundary;
        if (! $this->hasValidBoundary()) {
            return false;
        }

        $n = count($boundary);
        $inside = false;
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $latI = (float) ($boundary[$i]['lat'] ?? $boundary[$i]['latitude'] ?? 0);
            $lngI = (float) ($boundary[$i]['lng'] ?? $boundary[$i]['longitude'] ?? 0);
            $latJ = (float) ($boundary[$j]['lat'] ?? $boundary[$j]['latitude'] ?? 0);
            $lngJ = (float) ($boundary[$j]['lng'] ?? $boundary[$j]['longitude'] ?? 0);

            if ($this->pointLiesOnSegment($lat, $lng, $latI, $lngI, $latJ, $lngJ)) {
                return true;
            }

            $denom = $latJ - $latI;
            if (abs($denom) < 1e-10) {
                continue;
            }
            if ((($latI <= $lat && $lat < $latJ) || ($latJ <= $lat && $lat < $latI))
                && ($lng < ($lat - $latI) * ($lngJ - $lngI) / $denom + $lngI)) {
                $inside = ! $inside;
            }
        }

        return $inside;
    }

    /**
     * Determine whether the stored boundary can form a polygon.
     */
    public function hasValidBoundary(): bool
    {
        $boundary = $this->boundary;

        if (! is_array($boundary) || count($boundary) < 3) {
            return false;
        }

        foreach ($boundary as $point) {
            if (! is_array($point)) {
                return false;
            }

            $lat = $point['lat'] ?? $point['latitude'] ?? null;
            $lng = $point['lng'] ?? $point['longitude'] ?? null;

            if (! is_numeric($lat) || ! is_numeric($lng)) {
                return false;
            }
        }

        return true;
    }

    private function pointLiesOnSegment(
        float $lat,
        float $lng,
        float $latA,
        float $lngA,
        float $latB,
        float $lngB,
    ): bool {
        $epsilon = 1e-10;
        $crossProduct = ($lng - $lngA) * ($latB - $latA)
            - ($lat - $latA) * ($lngB - $lngA);

        if (abs($crossProduct) > $epsilon) {
            return false;
        }

        return $lat >= min($latA, $latB) - $epsilon
            && $lat <= max($latA, $latB) + $epsilon
            && $lng >= min($lngA, $lngB) - $epsilon
            && $lng <= max($lngA, $lngB) + $epsilon;
    }

    /**
     * Find the first active zone whose boundary contains the given point.
     * Returns the Zone model or null if none found.
     */
    public static function findZoneContainingPoint(?float $lat, ?float $lng): ?self
    {
        if ($lat === null || $lng === null) {
            return null;
        }

        $zones = self::where('status', true)->get();
        foreach ($zones as $zone) {
            if ($zone->containsPoint($lat, $lng)) {
                return $zone;
            }
        }

        return null;
    }
}
