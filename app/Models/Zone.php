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
     * Get the shops located in this zone.
     */
    public function shops()
    {
        return $this->hasMany(Shop::class);
    }
}
