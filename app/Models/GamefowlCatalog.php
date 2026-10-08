<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class GamefowlCatalog extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_INACTIVE = 'inactive';

    public const STATUS_REJECTED = 'rejected';

    protected $table = 'gamefowl_catalog';

    protected $fillable = [
        'name',
        'bloodline_id',
        'age_type_id',
        'class_id',
        'description',
        'images',
        'primary_image_index',
        'status',
        'created_by',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'images' => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function scopeListed(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_ACTIVE, self::STATUS_INACTIVE]);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function bloodline()
    {
        return $this->belongsTo(GamefowlLookup::class, 'bloodline_id');
    }

    public function ageType()
    {
        return $this->belongsTo(GamefowlLookup::class, 'age_type_id');
    }

    public function gamefowlClass()
    {
        return $this->belongsTo(GamefowlLookup::class, 'class_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
