<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * User type constants
     */
    const TYPE_SUPER_ADMIN = 'super_admin';
    const TYPE_ADMIN = 'admin';
    const TYPE_VENDOR = 'vendor';
    const TYPE_VETERINARIAN = 'veterinarian';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'user_type',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
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
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Get the dashboard URL based on user type.
     *
     * @return string
     */
    public function getDashboardUrl(): string
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
     * Check if user is a specific type.
     *
     * @param string $type
     * @return bool
     */
    public function isType(string $type): bool
    {
        return $this->user_type === $type;
    }
}
