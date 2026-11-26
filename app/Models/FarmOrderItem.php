<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FarmOrderItem extends Model
{
    protected $guarded = [];

    protected $casts = [
        'snapshot' => 'array',
        'quantity' => 'integer',
        'bird_count' => 'integer',
        'unit_price_cents' => 'integer',
        'vendor_unit_price_cents' => 'integer',
        'platform_fee_cents' => 'integer',
    ];

    public function listing()
    {
        return $this->belongsTo(FarmGamefowlListing::class, 'listing_id');
    }

    /**
     * Farm's unit price at purchase. Older rows stored only the farm price in unit_price_cents.
     */
    public function farmUnitPriceCents(): int
    {
        if ($this->vendor_unit_price_cents !== null) {
            return (int) $this->vendor_unit_price_cents;
        }

        $snapshot = is_array($this->snapshot) ? $this->snapshot : [];
        if (array_key_exists('vendor_unit_price_cents', $snapshot) && $snapshot['vendor_unit_price_cents'] !== null) {
            return (int) $snapshot['vendor_unit_price_cents'];
        }

        return (int) $this->unit_price_cents;
    }
}
