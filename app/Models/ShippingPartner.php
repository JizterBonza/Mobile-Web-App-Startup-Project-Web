<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShippingPartner extends Model
{
    protected $fillable = [
        'name',
        'registered_business_name',
        'owner_name',
        'address',
        'city',
        'province',
        'contact_number',
        'email',
        'service_area',
        'permits',
        'status',
    ];

    /**
     * Login account created with this shipping partner.
     */
    public function user()
    {
        return $this->hasOne(User::class, 'shipping_partner_id')
            ->where('user_type', User::TYPE_SHIPPING_PARTNER);
    }

    /**
     * Every login connected to this company.
     */
    public function users()
    {
        return $this->hasMany(User::class, 'shipping_partner_id');
    }
}
