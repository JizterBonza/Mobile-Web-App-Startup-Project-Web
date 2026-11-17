<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeaturedEntry extends Model
{
    public const SECTION_PRODUCT = 'product';

    public const SECTION_AGRIVET_STORE = 'agrivet_store';

    public const SECTION_FARM = 'farm';

    public const MAX_PER_SECTION = 24;

    protected $fillable = [
        'section',
        'entity_id',
        'sort_order',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'entity_id' => 'integer',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
            'created_by' => 'integer',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function sections(): array
    {
        return [
            self::SECTION_PRODUCT => 'Products',
            self::SECTION_AGRIVET_STORE => 'Agrivet Stores',
            self::SECTION_FARM => 'Farms',
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
