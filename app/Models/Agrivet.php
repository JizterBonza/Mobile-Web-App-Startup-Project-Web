<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Shop;
use Illuminate\Support\Facades\DB;

class Agrivet extends Model
{
    public static function statusIsActive(mixed $status): bool
    {
        return strtolower(trim((string) $status)) === 'active';
    }

    public function isActive(): bool
    {
        return self::statusIsActive($this->status);
    }

    protected static function booted(): void
    {
        static::updated(function (Agrivet $agrivet) {
            if ($agrivet->wasChanged('status') && ! $agrivet->isActive()) {
                $agrivet->revokeMemberAccess();
            }
        });
    }

    /**
     * Drop sessions for people who can no longer sign in because this Agrivet is inactive.
     */
    public function revokeMemberAccess(): void
    {
        $manager = $this->ownerManager()->first();
        if ($manager && ! $manager->organizationAllowsAccess()) {
            $manager->revokeAccess();
        }

        $vendorIds = DB::table('agrivet_vendor')
            ->where('agrivet_id', $this->id)
            ->pluck('vendor_id')
            ->unique()
            ->filter();

        if ($vendorIds->isEmpty()) {
            return;
        }

        User::query()->whereIn('id', $vendorIds)->get()->each(function (User $vendor) {
            if (! $vendor->organizationAllowsAccess()) {
                $vendor->revokeAccess();
            }
        });
    }

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
