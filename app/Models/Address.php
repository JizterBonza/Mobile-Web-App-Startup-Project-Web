<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Address extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'addresses';

    /**
     * Address type constants
     */
    const TYPE_HOME = 'home';
    const TYPE_WORK = 'work';
    const TYPE_FARM = 'farm';
    const TYPE_OTHER = 'other';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'address_label',
        'address_type',
        'recipient_name',
        'contact_number',
        'region',
        'province',
        'city_municipality',
        'barangay',
        'postal_code',
        'street_address',
        'full_address',
        'additional_notes',
        'latitude',
        'longitude',
        'is_default',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the user that owns the address.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope a query to only include active addresses.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include default addresses.
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Scope a query to filter by address type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('address_type', $type);
    }

    /**
     * Set this address as the default for the user.
     * Automatically unsets any previous default address.
     */
    public function setAsDefault(): bool
    {
        // Unset all other default addresses for this user
        static::where('user_id', $this->user_id)
            ->where('id', '!=', $this->id)
            ->update(['is_default' => false]);

        // Set this address as default
        return $this->update(['is_default' => true]);
    }

    /**
     * Get the formatted address (computed from components).
     */
    public function getFormattedAddressAttribute(): string
    {
        $parts = array_filter([
            $this->street_address,
            $this->barangay,
            $this->city_municipality,
            $this->province,
            $this->region,
            $this->postal_code,
        ]);

        return implode(', ', $parts);
    }

    /**
     * Build and set the full_address from components.
     */
    public function buildFullAddress(): string
    {
        $parts = array_filter([
            $this->street_address,
            $this->barangay,
            $this->city_municipality,
            $this->province,
            $this->region,
            $this->postal_code,
        ]);

        return implode(', ', $parts);
    }

    /**
     * Get the short formatted address (city and barangay only).
     */
    public function getShortAddressAttribute(): string
    {
        $parts = array_filter([
            $this->barangay,
            $this->city_municipality,
        ]);

        return implode(', ', $parts);
    }

    /**
     * Check if address has geolocation coordinates.
     */
    public function hasCoordinates(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }

    /**
     * Get available address types.
     */
    public static function getAddressTypes(): array
    {
        return [
            self::TYPE_HOME => 'Home',
            self::TYPE_WORK => 'Work',
            self::TYPE_FARM => 'Farm',
            self::TYPE_OTHER => 'Other',
        ];
    }
}

