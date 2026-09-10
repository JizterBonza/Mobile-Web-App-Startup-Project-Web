<?php

namespace App\Models;

use App\Support\PublicStorage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ProductCatalog extends Model
{
    public const STATUS_PENDING  = 'pending';
    public const STATUS_ACTIVE   = 'active';
    public const STATUS_INACTIVE = 'inactive';
    public const STATUS_REJECTED = 'rejected';

    public const RESTOCK_BLOCKED_MESSAGE = 'This product is disabled in the catalog and cannot be restocked.';

    /**
     * @var array{0: \Illuminate\Support\Collection<int, self>, 1: \Illuminate\Support\Collection<string, self>}|null
     */
    private static ?array $listedLookups = null;

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

    protected static function booted(): void
    {
        static::updated(function (self $catalog) {
            self::clearListedLookups();

            if (! in_array($catalog->status, [self::STATUS_ACTIVE, self::STATUS_INACTIVE], true)) {
                return;
            }

            $watched = [
                'product_name',
                'category_id',
                'sub_category_id',
                'weight',
                'unit',
                'description',
                'images',
                'primary_image_index',
            ];

            if ($catalog->wasChanged($watched)) {
                $previousName = $catalog->getOriginal('product_name');
                $catalog->syncShopListings(is_string($previousName) ? $previousName : null);
            }
        });

        static::deleted(function () {
            self::clearListedLookups();
        });
    }

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
        $catalogIds = [];
        $bundleIds = [];

        foreach ($items as $item) {
            if (self::itemIsBundle($item)) {
                foreach (self::bundleCatalogIds($item) as $catalogId) {
                    $bundleIds[] = $catalogId;
                }
            } elseif ($id = self::itemCatalogId($item)) {
                $catalogIds[] = $id;
            } elseif (! empty($item->item_name)) {
                $names[] = $item->item_name;
            }
        }

        $names = array_values(array_unique($names));
        $catalogIds = array_values(array_unique($catalogIds));
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

        $listedById = [];
        $activeById = [];
        if ($catalogIds !== []) {
            $listed = self::listedInCatalog()
                ->whereIn('id', $catalogIds)
                ->get(['id', 'status']);

            foreach ($listed as $catalog) {
                $listedById[(int) $catalog->id] = true;
                if ($catalog->status === self::STATUS_ACTIVE) {
                    $activeById[(int) $catalog->id] = true;
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

            $catalogId = self::itemCatalogId($item);
            if ($catalogId !== null) {
                $flags[$item->id] = isset($listedById[$catalogId]) && ! isset($activeById[$catalogId]);
                continue;
            }

            $key = mb_strtolower((string) ($item->item_name ?? ''));
            $inCatalog = $key !== '' && isset($listedNames[$key]);
            $isActive = isset($activeNames[$key]);
            $flags[$item->id] = $inCatalog && ! $isActive;
        }

        return $flags;
    }

    /**
     * Copy catalog identity fields onto shop listings so vendor, owner-manager, and customer views stay current.
     */
    public function syncShopListings(?string $previousName = null): void
    {
        $snapshot = $this->shopListingSnapshot();
        $snapshot['updated_at'] = now();

        $query = DB::table('items')->where(function ($q) {
            $q->where('is_bundle', false)->orWhereNull('is_bundle');
        });

        $hasCatalogId = Schema::hasColumn('items', 'product_catalog_id');
        if ($hasCatalogId) {
            $snapshot['product_catalog_id'] = $this->id;
            $query->where(function ($q) use ($previousName) {
                $q->where('product_catalog_id', $this->id);
                if (is_string($previousName) && $previousName !== '') {
                    $q->orWhere(function ($inner) use ($previousName) {
                        $inner->whereNull('product_catalog_id')
                            ->where('item_name', $previousName);
                    });
                }
            });
        } elseif (is_string($previousName) && $previousName !== '') {
            $query->where('item_name', $previousName);
        } else {
            $query->where('item_name', $this->product_name);
        }

        $query->update($snapshot);

        $this->syncBundleListings();
    }

    /**
     * Live catalog fields for a shop item, or null when the item is a custom listing/bundle.
     *
     * @return array<string, mixed>|null
     */
    public static function liveDetailsForItem(object $item): ?array
    {
        if (self::itemIsBundle($item)) {
            return null;
        }

        $catalog = self::findCatalogForItem($item);
        if (! $catalog) {
            return null;
        }

        return [
            'product_catalog_id' => $catalog->id,
            'item_name' => $catalog->product_name,
            'item_description' => $catalog->description,
            'weight' => $catalog->weight,
            'metric' => $catalog->unit,
            'category' => $catalog->category_id,
            'sub_category_id' => $catalog->sub_category_id,
            'brand' => $catalog->brand,
            'images' => $catalog->listingImagePaths(),
            'category_name' => optional($catalog->category)->category_name,
            'sub_category_name' => optional($catalog->subCategory)->sub_category_name,
        ];
    }

    public static function applyLiveDetailsToItem(object $item): void
    {
        $live = self::liveDetailsForItem($item);
        if (! $live) {
            return;
        }

        if ($item instanceof Item) {
            $item->setRawAttributes(array_merge($item->getAttributes(), [
                'item_name' => $live['item_name'],
                'item_description' => $live['item_description'],
                'weight' => $live['weight'],
                'metric' => $live['metric'],
                'category' => $live['category'],
                'sub_category_id' => $live['sub_category_id'],
                'item_images' => json_encode($live['images']),
                'product_catalog_id' => $live['product_catalog_id'],
            ]), true);

            return;
        }

        $item->item_name = $live['item_name'];
        $item->item_description = $live['item_description'];
        $item->weight = $live['weight'];
        $item->metric = $live['metric'];
        $item->category = $live['category'];
        $item->sub_category_id = $live['sub_category_id'];
        $item->product_catalog_id = $live['product_catalog_id'];
        $item->brand = $live['brand'] ?? ($item->brand ?? '');
        $item->item_images = json_encode($live['images']);
        if (! empty($live['category_name'])) {
            $item->category_name = $live['category_name'];
        }
        if (! empty($live['sub_category_name'])) {
            $item->sub_category_name = $live['sub_category_name'];
        }
    }

    public static function overlayEloquentItem(Item $item): void
    {
        self::applyLiveDetailsToItem($item);
    }

    public static function findCatalogForItem(object $item): ?self
    {
        if (self::itemIsBundle($item)) {
            return null;
        }

        [$byId, $byName] = self::listedLookups();

        $catalogId = self::itemCatalogId($item);
        if ($catalogId !== null) {
            return $byId->get($catalogId);
        }

        $name = self::itemRawName($item);
        if ($name === '') {
            return null;
        }

        return $byName->get(mb_strtolower($name));
    }

    /**
     * @return list<string>
     */
    public function listingImagePaths(): array
    {
        $images = array_values(array_filter(
            $this->images ?? [],
            fn ($image) => is_string($image) && $image !== ''
        ));

        $primary = (int) ($this->primary_image_index ?? 0);
        if ($primary > 0 && array_key_exists($primary, $images)) {
            $primaryImage = $images[$primary];
            unset($images[$primary]);
            array_unshift($images, $primaryImage);
            $images = array_values($images);
        }

        return array_values(array_filter(array_map(
            fn ($image) => PublicStorage::url($image),
            $images
        )));
    }

    /**
     * @return array<string, mixed>
     */
    public function shopListingSnapshot(): array
    {
        $images = $this->listingImagePaths();

        return [
            'item_name' => $this->product_name,
            'item_description' => $this->description,
            'weight' => $this->weight,
            'metric' => $this->unit,
            'category' => $this->category_id,
            'sub_category_id' => $this->sub_category_id,
            'item_images' => ! empty($images) ? json_encode($images) : null,
        ];
    }

    public static function clearListedLookups(): void
    {
        self::$listedLookups = null;
    }

    /**
     * @return array{0: \Illuminate\Support\Collection<int, self>, 1: \Illuminate\Support\Collection<string, self>}
     */
    private static function listedLookups(): array
    {
        if (self::$listedLookups !== null) {
            return self::$listedLookups;
        }

        $listed = self::listedInCatalog()
            ->with('category', 'subCategory')
            ->get();

        $byId = $listed->keyBy(fn (self $catalog) => (int) $catalog->id);
        $byName = $listed
            ->sortBy(fn (self $catalog) => $catalog->status === self::STATUS_ACTIVE ? 1 : 0)
            ->keyBy(fn (self $catalog) => mb_strtolower((string) $catalog->product_name));

        self::$listedLookups = [$byId, $byName];

        return self::$listedLookups;
    }

    private function syncBundleListings(): void
    {
        $bundles = DB::table('items')->where('is_bundle', true)->get();

        foreach ($bundles as $bundle) {
            $ids = self::bundleCatalogIds($bundle);
            if ($ids === [] || ! in_array($this->id, $ids, true)) {
                continue;
            }

            $catalogsById = self::listedInCatalog()
                ->whereIn('id', $ids)
                ->get()
                ->keyBy(fn (self $catalog) => (int) $catalog->id);

            $ordered = collect($ids)
                ->map(fn ($id) => $catalogsById->get((int) $id))
                ->filter()
                ->values();

            if ($ordered->isEmpty()) {
                continue;
            }

            $images = $ordered
                ->flatMap(fn (self $catalog) => array_slice($catalog->listingImagePaths(), 0, 3))
                ->values()
                ->all();

            ['weight' => $weight, 'metric' => $metric] = self::bundleWeightAndMetric($ordered);

            $update = [
                'weight' => $weight,
                'metric' => $metric,
                'item_images' => ! empty($images) ? json_encode($images) : null,
                'updated_at' => now(),
            ];

            $prefix = 'Bundle containing: ';
            if (str_starts_with((string) ($bundle->item_description ?? ''), $prefix)) {
                $update['item_description'] = $prefix.$ordered->pluck('product_name')->join(', ');
            }

            DB::table('items')->where('id', $bundle->id)->update($update);
        }
    }

    /**
     * @param  \Illuminate\Support\Collection<int, self>  $catalogProducts
     * @return array{weight: ?float, metric: ?string}
     */
    public static function bundleWeightAndMetric($catalogProducts): array
    {
        $withWeight = $catalogProducts->filter(fn ($p) => $p->weight !== null);

        $metric = $catalogProducts->first(fn ($p) => ! empty($p->unit))?->unit;

        if ($withWeight->isEmpty()) {
            return ['weight' => null, 'metric' => $metric];
        }

        $units = $withWeight
            ->pluck('unit')
            ->map(fn ($u) => strtolower(trim($u ?? '')))
            ->unique()
            ->filter()
            ->values();

        if ($units->count() === 1) {
            return [
                'weight' => round($withWeight->sum(fn ($p) => (float) $p->weight), 2),
                'metric' => $withWeight->first()->unit ?? $metric,
            ];
        }

        $totalWeightKg = $withWeight->sum(
            fn ($p) => self::convertCatalogWeightToKg((float) $p->weight, $p->unit)
        );

        return [
            'weight' => round($totalWeightKg, 2),
            'metric' => 'kg',
        ];
    }

    private static function convertCatalogWeightToKg(float $weight, ?string $metric): float
    {
        return match (strtolower(trim($metric ?? 'kg'))) {
            'g' => $weight / 1000,
            'mg' => $weight / 1_000_000,
            'lb', 'lbs' => $weight * 0.453592,
            'oz' => $weight * 0.0283495,
            'ml' => $weight / 1000,
            'l' => $weight,
            'kg' => $weight,
            default => $weight,
        };
    }

    private static function itemCatalogId(object $item): ?int
    {
        $id = $item instanceof Model
            ? ($item->getAttributes()['product_catalog_id'] ?? null)
            : ($item->product_catalog_id ?? null);

        if ($id === null || $id === '') {
            return null;
        }

        return (int) $id;
    }

    private static function itemRawName(object $item): string
    {
        $name = $item instanceof Model
            ? ($item->getAttributes()['item_name'] ?? '')
            : ($item->item_name ?? '');

        return trim((string) $name);
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

    public function items()
    {
        return $this->hasMany(Item::class, 'product_catalog_id');
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
