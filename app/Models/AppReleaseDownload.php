<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppReleaseDownload extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'app_release_id',
        'user_id',
        'ip_address',
        'device_info',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function release(): BelongsTo
    {
        return $this->belongsTo(AppRelease::class, 'app_release_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
