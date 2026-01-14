<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Shop;

class Agrivet extends Model
{
    protected $fillable = [
        'name',
        'description',
        'contact_number',
        'email',
        'logo_url',
        'status',
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

    /**
     * Get the shops associated with this agrivet.
     */
    public function shops()
    {
        return $this->hasMany(Shop::class);
    }

    /**
     * Get the primary shop associated with this agrivet.
     */
    public function shop()
    {
        return $this->hasOne(Shop::class);
    }
}
