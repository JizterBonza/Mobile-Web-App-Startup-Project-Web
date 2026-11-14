<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BreederPostLike extends Model
{
    protected $fillable = ['breeder_post_id', 'user_id'];

    public function post(): BelongsTo
    {
        return $this->belongsTo(BreederPost::class, 'breeder_post_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
