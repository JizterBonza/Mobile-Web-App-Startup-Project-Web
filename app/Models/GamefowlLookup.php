<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GamefowlLookup extends Model
{
    public const TYPE_BLOODLINE = 'bloodline';

    public const TYPE_AGE = 'age_type';

    public const TYPE_CLASS = 'class';

    protected $fillable = [
        'type',
        'name',
        'description',
        'status',
    ];
}
