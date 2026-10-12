<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KlasrumReaction extends Model
{
    public const TYPE_LIKE = 'like';

    protected $table = 'klasrum_reactions';

    protected $fillable = [
        'klasrum_content_id',
        'user_id',
        'type',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(KlasrumContent::class, 'klasrum_content_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
