<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserDetail extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'user_details';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'email_confirmed',
        'mobile_number',
        'shipping_address',
        'profile_image_url',
        'avatar',
        'vet_license_number',
        'vet_license_expiration',
        'vet_issuing_authority',
        'vet_service_area',
        'vet_specialization',
        'vet_clinic_name',
        'vet_clinic_address',
        'vet_license_front_path',
        'vet_license_back_path',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_confirmed' => 'boolean',
            'vet_license_expiration' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the users for the user detail.
     */
    public function users()
    {
        return $this->hasMany(User::class, 'user_detail_id');
    }
}

