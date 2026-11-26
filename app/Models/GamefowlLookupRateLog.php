<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class GamefowlLookupRateLog extends Model
{
    protected $table = 'gamefowl_lookup_rate_logs';

    protected $fillable = [
        'gamefowl_lookup_id',
        'user_id',
        'old_rate',
        'new_rate',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'old_rate' => 'decimal:2',
            'new_rate' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function lookup()
    {
        return $this->belongsTo(GamefowlLookup::class, 'gamefowl_lookup_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function logChange(GamefowlLookup $lookup, ?float $oldRate, float $newRate): self
    {
        $request = request();

        return static::create([
            'gamefowl_lookup_id' => $lookup->id,
            'user_id' => Auth::id(),
            'old_rate' => $oldRate,
            'new_rate' => $newRate,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }
}
