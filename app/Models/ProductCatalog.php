<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class ProductCatalog extends Model
{
    public const STATUS_PENDING  = 'pending';
    public const STATUS_ACTIVE   = 'active';
    public const STATUS_INACTIVE = 'inactive';
    public const STATUS_REJECTED = 'rejected';

    public const RESTOCK_BLOCKED_MESSAGE = 'This product is disabled in the catalog and cannot be restocked.';

    protected $table = 'product_catalog';

    protected $fillable = [
        'brand',
        'product_name',
        'category_id',
        'sub_category_id',
        'weight',
        'unit',
        'description',
        'images',
        'primary_image_index',
        'status',
        'created_by',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'images'      => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeListedInCatalog(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_ACTIVE, self::STATUS_INACTIVE]);
    }

    /**
     * Whether increasing stock of this shop item is blocked because its catalog product is inactive.
     */
    public static function restockBlockedForItem(object $item): bool
    {
        $flags = self::restockBlockedFlagsForItems([$item]);
        $id = $item->id ?? null;

        return $id !== null ? (bool) ($flags[$id] ?? false) : false;
    }

    /**
     * @param  iterable<int, object>  $items
     * @return array<int|string, bool> keyed by item id
     */
    public static function restockBlockedFlagsForItems(iterable $items): array
    {
        $items = collect($items);
        $names = [];
        $bundleIds = [];

        foreach ($items as $item) {
            if (self::itemIsBundle($item)) {
                foreach (self::bundleCatalogIds($item) as $catalogId) {
                    $bundleIds[] = $catalogId;
                }
            } elseif (! empty($item->item_name)) {
                $names[] = $item->item_name;
            }
        }

        $names = array_values(array_unique($names));
        $bundleIds = array_values(array_unique($bundleIds));

        $activeNames = [];
        $listedNames = [];
        if ($names !== []) {
            $listed = self::listedInCatalog()
                ->whereIn('product_name', $names)
                ->get(['product_name', 'status']);

            foreach ($listed as $catalog) {
                $key = mb_strtolower((string) $catalog->product_name);
                $listedNames[$key] = true;
                if ($catalog->status === self::STATUS_ACTIVE) {
                    $activeNames[$key] = true;
                }
            }
        }

        $activeBundleIds = $bundleIds === []
            ? []
            : self::approved()->whereIn('id', $bundleIds)->pluck('id')->map(fn ($id) => (int) $id)->all();

        $flags = [];
        foreach ($items as $item) {
            if ($item->id === null) {
                continue;
            }

            if (self::itemIsBundle($item)) {
                $ids = self::bundleCatalogIds($item);
                $flags[$item->id] = $ids !== [] && array_diff($ids, $activeBundleIds) !== [];
                continue;
            }

            $key = mb_strtolower((string) ($item->item_name ?? ''));
            $inCatalog = $key !== '' && isset($listedNames[$key]);
            $isActive = isset($activeNames[$key]);
            $flags[$item->id] = $inCatalog && ! $isActive;
        }

        return $flags;
    }

    private static function itemIsBundle(object $item): bool
    {
        return (bool) ($item->is_bundle ?? false);
    }

    /**
     * @return list<int>
     */
    private static function bundleCatalogIds(object $item): array
    {
        $ids = $item->bundle_catalog_ids ?? [];
        if (is_string($ids)) {
            $ids = json_decode($ids, true);
        }

        if (! is_array($ids)) {
            return [];
        }

        return array_values(array_unique(array_map('intval', $ids)));
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function subCategory()
    {
        return $this->belongsTo(SubCategory::class, 'sub_category_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
