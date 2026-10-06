<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Farm extends Model
{
    protected $fillable = [
        'name',
        'registered_business_name',
        'owner_name',
        'description',
        'contact_number',
        'email',
        'permits',
        'logo_url',
        'banner_url',
        'address',
        'city',
        'province',
        'postal_code',
        'latitude',
        'longitude',
        'cover_url',
        'permit_url',
        'operating_days',
        'operating_hours',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    /**
     * Owner/manager login account created with this farm.
     */
    public function ownerManager()
    {
        return $this->hasOne(User::class, 'farm_id')
            ->where('user_type', User::TYPE_OWNER_MANAGER);
    }
};
