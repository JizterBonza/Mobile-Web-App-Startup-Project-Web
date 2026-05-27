<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Shop;

class Agrivet extends Model
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
     * Owner/manager login account for this agrivet (manages stores under the business).
     */
    public function ownerManager()
    {
        return $this->hasOne(User::class, 'agrivet_id')
            ->where('user_type', User::TYPE_OWNER_MANAGER);
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
