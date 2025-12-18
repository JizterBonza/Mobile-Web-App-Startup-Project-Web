<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Agrivet;
use App\Models\Notification;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * User type constants
     */
    const TYPE_SUPER_ADMIN = 'super_admin';
    const TYPE_ADMIN = 'admin';
    const TYPE_VENDOR = 'vendor';
    const TYPE_VETERINARIAN = 'veterinarian';
    const TYPE_CUSTOMER = 'customer';
    const TYPE_RIDER = 'rider';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_detail_id',
        'user_credential_id',
        'status',
        'user_type',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the user detail for the user.
     */
    public function userDetail()
    {
        return $this->belongsTo(UserDetail::class, 'user_detail_id');
    }

    /**
     * Get the user credential for the user.
     */
    public function userCredential()
    {
        return $this->belongsTo(UserCredential::class, 'user_credential_id');
    }

    /**
     * Get the dashboard URL based on user type.
     */
    public function getDashboardUrl()
    {
        return match($this->user_type) {
            self::TYPE_SUPER_ADMIN => '/dashboard/super-admin',
            self::TYPE_ADMIN => '/dashboard/admin',
            self::TYPE_VENDOR => '/dashboard/vendor',
            self::TYPE_VETERINARIAN => '/dashboard/veterinarian',
            default => '/dashboard',
        };
    }

    /**
     * Get the agrivets associated with this vendor.
     */
    public function agrivets()
    {
        return $this->belongsToMany(Agrivet::class, 'agrivet_vendor', 'vendor_id', 'agrivet_id')
            ->withPivot('status')
            ->withTimestamps();
    }

    /**
     * Get all addresses for the user.
     */
    public function addresses()
    {
        return $this->hasMany(Address::class);
    }

    /**
     * Get the user's default address.
     */
    public function defaultAddress()
    {
        return $this->hasOne(Address::class)->where('is_default', true);
    }

    /**
     * Get the user's active addresses.
     */
    public function activeAddresses()
    {
        return $this->hasMany(Address::class)->where('is_active', true);
    }

    /**
     * Get all notifications for the user.
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Get unread notifications for the user.
     */
    public function unreadNotifications()
    {
        return $this->hasMany(Notification::class)->where('read', false);
    }
}
