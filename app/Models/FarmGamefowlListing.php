<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FarmGamefowlListing extends Model
{
    private ?float $markupPercent = null;

    protected $fillable = [
        'farm_id',
        'gamefowl_catalog_id',
        'is_bundle',
        'bundle_name',
        'bundle_type',
        'bundle_catalog_ids',
        'bundle_image',
        'price',
        'selling_unit',
        'stock',
        'release_option',
        'release_date',
        'popularity',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'is_bundle' => 'boolean',
            'bundle_catalog_ids' => 'array',
            'price' => 'float',
            'stock' => 'integer',
            'reserved_stock' => 'integer',
            'popularity' => 'integer',
            'release_date' => 'date',
        ];
    }

    public function farm()
    {
        return $this->belongsTo(Farm::class);
    }

    public function gamefowl()
    {
        return $this->belongsTo(GamefowlCatalog::class, 'gamefowl_catalog_id');
    }

    /**
     * Highest bloodline markup among the primary bird and every bundle member.
     */
    public function getMarkupPercent(): float
    {
        if ($this->markupPercent !== null) {
            return $this->markupPercent;
        }

        $rates = GamefowlLookup::bloodlineRates();
        $markup = 0.0;

        foreach ($this->bloodlineIds() as $id) {
            $markup = max($markup, $rates[$id] ?? 0.0);
        }

        return $this->markupPercent = $markup;
    }

    /**
     * Price entered by the farm, before platform markup.
     */
    public function getFarmUnitPrice(): float
    {
        return round((float) $this->price, 2);
    }

    /**
     * Customer unit price. Listings have no discount, so this is the price charged.
     */
    public function getCustomerUnitPrice(): float
    {
        return round($this->getFarmUnitPrice() * (1 + $this->getMarkupPercent() / 100), 2);
    }

    /**
     * Markup kept by the platform on one unit.
     */
    public function getPlatformFeePerUnit(): float
    {
        return round(max(0, $this->getCustomerUnitPrice() - $this->getFarmUnitPrice()), 2);
    }

    /**
     * @return array<int, int>
     */
    private function bloodlineIds(): array
    {
        $ids = collect();

        if ($this->relationLoaded('gamefowl')) {
            $ids->push($this->gamefowl?->bloodline_id);
        } elseif ($this->gamefowl_catalog_id) {
            $ids->push(GamefowlCatalog::query()->whereKey($this->gamefowl_catalog_id)->value('bloodline_id'));
        }

        if ($this->is_bundle && $this->relationLoaded('bundleMembers')) {
            $ids = $ids->merge(collect($this->getRelation('bundleMembers'))->pluck('bloodline_id'));
        } elseif ($this->is_bundle) {
            $memberIds = collect($this->bundle_catalog_ids ?? [])
                ->map(fn ($id) => (int) $id)
                ->filter()
                ->unique()
                ->values();

            if ($memberIds->isNotEmpty()) {
                $ids = $ids->merge(
                    GamefowlCatalog::query()->whereIn('id', $memberIds)->pluck('bloodline_id')
                );
            }
        }

        return $ids
            ->filter(fn ($id) => $id !== null && $id !== '')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }
}
