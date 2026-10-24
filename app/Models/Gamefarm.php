<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Gamefarm extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'bloodlines',
        'logo_path',
        'membership_certificate_path',
        'facility_images',
        'primary_facility_index',
        'street',
        'barangay',
        'city',
        'province',
        'postal_code',
        'latitude',
        'longitude',
    ];

    protected function casts(): array
    {
        return [
            'facility_images' => 'array',
            'primary_facility_index' => 'integer',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    public function breeder()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
