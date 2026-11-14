<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BreederFollow extends Model
{
    protected $fillable = ['follower_id', 'breeder_id'];

    public function follower(): BelongsTo
    {
        return $this->belongsTo(User::class, 'follower_id');
    }

    public function breeder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'breeder_id');
    }
}
