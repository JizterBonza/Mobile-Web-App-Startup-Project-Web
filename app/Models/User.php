<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Agrivet;
use App\Models\Farm;
use App\Models\ShippingPartner;
use App\Models\Shop;
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
    const TYPE_BREEDER = 'breeder';
    const TYPE_RIDER = 'rider';

    const TYPE_SHIPPING_PARTNER = 'shipping_partner';
    const TYPE_OWNER_MANAGER = 'owner_manager';

    const STATUS_ACTIVE = 'active';

    const INACTIVE_ACCOUNT_MESSAGE = 'Your account is inactive. Please contact an administrator.';

    const INACTIVE_AGRIVET_MESSAGE = 'Your Agrivet is inactive. Please contact an administrator.';

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
        'agrivet_id',
        'farm_id',
        'shipping_partner_id',
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

    protected static function booted(): void
    {
        static::updated(function (User $user) {
            if ($user->wasChanged('status') && ! $user->isActive()) {
                $user->revokeAccess();
            }
        });
    }

    /**
     * The account row itself is active, before Agrivet access is considered.
     */
    public function accountStatusIsActive(): bool
    {
        return strtolower(trim((string) $this->status)) === self::STATUS_ACTIVE;
    }

    /**
     * Owner/managers and vendors of an inactive Agrivet cannot sign in.
     * A vendor who still belongs to another active Agrivet can.
     */
    public function organizationAllowsAccess(): bool
    {
        if ($this->user_type === self::TYPE_OWNER_MANAGER && $this->agrivet_id) {
            if ($this->relationLoaded('managedAgrivet')) {
                return (bool) $this->managedAgrivet?->isActive();
            }

            $status = Agrivet::query()->whereKey($this->agrivet_id)->value('status');

            return Agrivet::statusIsActive($status);
        }

        if ($this->user_type === self::TYPE_VENDOR) {
            if ($this->relationLoaded('agrivets')) {
                if ($this->agrivets->isEmpty()) {
                    return true;
                }

                return $this->agrivets->contains(fn (Agrivet $agrivet) => $agrivet->isActive());
            }

            $assigned = DB::table('agrivet_vendor')->where('vendor_id', $this->id)->exists();
            if (! $assigned) {
                return true;
            }

            return DB::table('agrivet_vendor')
                ->join('agrivets', 'agrivets.id', '=', 'agrivet_vendor.agrivet_id')
                ->where('agrivet_vendor.vendor_id', $this->id)
                ->whereRaw('LOWER(TRIM(agrivets.status)) = ?', ['active'])
                ->exists();
        }

        return true;
    }

    /**
     * Sign-in and API access require an active account and an active Agrivet.
     */
    public function isActive(): bool
    {
        return $this->accountStatusIsActive() && $this->organizationAllowsAccess();
    }

    /**
     * Status shown to admins. An active account under a disabled Agrivet is inactive.
     */
    public function effectiveStatus(): string
    {
        if (! $this->accountStatusIsActive()) {
            $status = strtolower(trim((string) $this->status));

            return $status !== '' ? $status : 'inactive';
        }

        return $this->organizationAllowsAccess() ? self::STATUS_ACTIVE : 'inactive';
    }

    /**
     * The account cannot be switched back on while its Agrivet is inactive.
     */
    public function accessLockedByOrganization(): bool
    {
        return in_array($this->user_type, [self::TYPE_OWNER_MANAGER, self::TYPE_VENDOR], true)
            && ! $this->organizationAllowsAccess();
    }

    public function inactiveMessage(): string
    {
        if ($this->accountStatusIsActive() && ! $this->organizationAllowsAccess()) {
            return self::INACTIVE_AGRIVET_MESSAGE;
        }

        return self::INACTIVE_ACCOUNT_MESSAGE;
    }

    /**
     * Drop API tokens so a deactivated account cannot keep calling the app.
     */
    public function revokeAccess(): void
    {
        $this->tokens()->delete();

        RefreshToken::query()
            ->where('user_id', $this->id)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
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
            self::TYPE_OWNER_MANAGER => '/dashboard/owner-manager',
            self::TYPE_VETERINARIAN => '/dashboard/veterinarian',
            self::TYPE_SHIPPING_PARTNER => '/dashboard/shipping-partner',
            default => '/login',
        };
    }

    /**
     * Dashboard path for roles that use this web app, or null when this account has no web dashboard.
     */
    public function getWebDashboardUrl(): ?string
    {
        return match ($this->user_type) {
            self::TYPE_SUPER_ADMIN,
            self::TYPE_ADMIN,
            self::TYPE_VENDOR,
            self::TYPE_OWNER_MANAGER,
            self::TYPE_VETERINARIAN,
            self::TYPE_SHIPPING_PARTNER => $this->getDashboardUrl(),
            default => null,
        };
    }

    /**
     * Agrivet this owner/manager account manages (stores under this business).
     */
    public function managedAgrivet()
    {
        return $this->belongsTo(Agrivet::class, 'agrivet_id');
    }

    /**
     * Farm this owner/manager account manages.
     */
    public function managedFarm()
    {
        return $this->belongsTo(Farm::class, 'farm_id');
    }

    /**
     * Shipping company this shipping partner account signs in for.
     */
    public function managedShippingPartner()
    {
        return $this->belongsTo(ShippingPartner::class, 'shipping_partner_id');
    }

    /**
     * Gamefarm registered with this breeder account.
     */
    public function gamefarm()
    {
        return $this->hasOne(Gamefarm::class);
    }

    /**
     * Get the agrivets associated with this vendor.
     */
    public function agrivets()
    {
        return $this->belongsToMany(Agrivet::class, 'agrivet_vendor', 'vendor_id', 'agrivet_id')
            ->withPivot('status', 'shop_id')
            ->withTimestamps();
    }

    /**
     * Get the shops associated with this vendor through the agrivet_vendor pivot.
     */
    public function shops()
    {
        return $this->belongsToMany(Shop::class, 'agrivet_vendor', 'vendor_id', 'shop_id')
            ->withPivot('agrivet_id', 'status')
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

    /**
     * Shop conversations where this user is the customer.
     */
    public function shopConversations()
    {
        return $this->hasMany(ShopConversation::class, 'customer_user_id');
    }
}
