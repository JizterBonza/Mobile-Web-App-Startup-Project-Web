<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Agrivet extends Model
{
    protected $fillable = [
        'name',
        'description',
        'address',
        'latitude',
        'longitude',
        'contact_number',
        'email',
        'logo_url',
        'status',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    /**
     * Get the vendors (users) associated with this agrivet.
     */
    public function vendors()
    {
        return $this->belongsToMany(User::class, 'agrivet_vendor', 'agrivet_id', 'vendor_id')
            ->withPivot('status')
            ->withTimestamps();
    }
}
