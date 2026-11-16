<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BreederPostImage extends Model
{
    protected $fillable = ['breeder_post_id', 'path', 'position'];

    protected function casts(): array
    {
        return ['position' => 'integer'];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(BreederPost::class, 'breeder_post_id');
    }
}
