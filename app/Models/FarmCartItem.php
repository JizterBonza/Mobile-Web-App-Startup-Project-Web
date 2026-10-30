<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FarmCartItem extends Model
{
    protected $guarded = [];

    protected $casts = ['quantity' => 'integer'];

    public function listing()
    {
        return $this->belongsTo(FarmGamefowlListing::class, 'listing_id');
    }
}
