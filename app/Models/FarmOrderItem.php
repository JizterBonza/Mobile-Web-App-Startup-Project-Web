<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FarmOrderItem extends Model
{
    protected $guarded = [];

    protected $casts = ['snapshot' => 'array', 'quantity' => 'integer', 'bird_count' => 'integer', 'unit_price_cents' => 'integer'];
}
