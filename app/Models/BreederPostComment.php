<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BreederPostComment extends Model
{
    use SoftDeletes;

    protected $fillable = ['breeder_post_id', 'user_id', 'body'];

    public function post(): BelongsTo
    {
        return $this->belongsTo(BreederPost::class, 'breeder_post_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
