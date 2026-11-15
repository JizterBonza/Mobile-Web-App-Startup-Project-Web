<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'items';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'shop_id',
        'product_catalog_id',
        'item_name',
        'item_description',
        'item_price',
        'discount_percent',
        'discount_type',
        'discount_expires_at',
        'item_quantity',
        'category',
        'item_images',
        'item_status',
        'average_rating',
        'total_reviews',
        'sold_count',
        'weight',
        'metric',
        'is_bundle',
        'bundle_catalog_ids',
    ];

    protected static function booted(): void
    {
        static::retrieved(function (Item $item) {
            ProductCatalog::overlayEloquentItem($item);
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'item_price' => 'decimal:2',
            'discount_percent' => 'decimal:2',
            'discount_expires_at' => 'datetime',
            'item_quantity' => 'integer',
            'item_images' => 'array',
            'average_rating' => 'decimal:2',
            'total_reviews' => 'integer',
            'sold_count' => 'integer',
            'weight' => 'decimal:2',
            'is_bundle' => 'boolean',
            'bundle_catalog_ids' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the shop that owns the item.
     */
    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    /**
     * Hide products whose store belongs to an inactive Agrivet.
     */
    public function scopeWhereShopAgrivetIsActive($query)
    {
        return $query->whereHas('shop', function ($shop) {
            $shop->whereAgrivetIsActive();
        });
    }

    public function shopAgrivetIsActive(): bool
    {
        $shop = $this->relationLoaded('shop') ? $this->shop : $this->shop()->first();

        return $shop instanceof Shop && $shop->agrivetIsActive();
    }

    /**
     * Catalog product this shop listing was created from.
     */
    public function productCatalog()
    {
        return $this->belongsTo(ProductCatalog::class, 'product_catalog_id');
    }

    /**
     * Get the category that the item belongs to.
     */
    public function categoryRelation()
    {
        return $this->belongsTo(Category::class, 'category');
    }

    /**
     * Get the rating reviews for the item.
     */
    public function ratingReviews()
    {
        return $this->hasMany(RatingReview::class);
    }

    /**
     * Get the currently active discount log for the item.
     */
    public function activeDiscountLog()
    {
        return $this->hasOne(DiscountLog::class)
            ->where('is_active', true)
            ->latest('id');
    }

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = ['shop_name', 'list_price', 'effective_price', 'active_discount_percent', 'markup_percent'];

    /**
     * Scope to product bundle items.
     */
    public function scopeBundled($query)
    {
        return $query->where('is_bundle', true);
    }

    /**
     * Scope to items with a discount that is not yet expired.
     */
    public function scopeWithActiveDiscount($query)
    {
        return $query
            ->where('discount_percent', '>', 0)
            ->where(function ($q) {
                $q->where('discount_type', 'manual')
                    ->orWhere(function ($timedQuery) {
                        $timedQuery->where('discount_type', 'timed')
                            ->whereNotNull('discount_expires_at')
                            ->where('discount_expires_at', '>=', now());
                    });
            });
    }

    /**
     * Active discount percentage (0 when expired or unset).
     */
    public function getActiveDiscountPercent(): float
    {
        if ($this->discount_percent === null || (float) $this->discount_percent <= 0) {
            return 0.0;
        }

        if ($this->discount_type === 'manual') {
            return (float) $this->discount_percent;
        }

        if ($this->discount_type === 'timed'
            && $this->discount_expires_at !== null
            && now()->lessThanOrEqualTo($this->discount_expires_at)) {
            return (float) $this->discount_percent;
        }

        return 0.0;
    }

    /**
     * Category markup percentage applied on top of the vendor's item_price.
     */
    public function getMarkupPercent(): float
    {
        if ($this->category === null || ! is_numeric($this->category)) {
            return 0.0;
        }

        return max(0.0, Category::rates()[(int) $this->category] ?? 0.0);
    }

    /**
     * Customer price before discount (item_price plus category markup).
     */
    public function getListPrice(): float
    {
        return round((float) $this->item_price * (1 + $this->getMarkupPercent() / 100), 2);
    }

    /**
     * Customer price after markup and active discount.
     */
    public function getEffectivePrice(): float
    {
        return $this->applyDiscount((float) $this->item_price * (1 + $this->getMarkupPercent() / 100));
    }

    /**
     * Vendor's share per unit: item_price after the active discount, without markup.
     */
    public function getVendorUnitPrice(): float
    {
        return $this->applyDiscount((float) $this->item_price);
    }

    /**
     * Markup portion of the effective price, kept by the platform.
     */
    public function getPlatformFeePerUnit(): float
    {
        return round(max(0, $this->getEffectivePrice() - $this->getVendorUnitPrice()), 2);
    }

    private function applyDiscount(float $price): float
    {
        $discount = $this->getActiveDiscountPercent();

        if ($discount <= 0) {
            return round($price, 2);
        }

        return round($price * (1 - $discount / 100), 2);
    }

    public function getListPriceAttribute(): float
    {
        return $this->getListPrice();
    }

    public function getEffectivePriceAttribute(): float
    {
        return $this->getEffectivePrice();
    }

    public function getMarkupPercentAttribute(): float
    {
        return $this->getMarkupPercent();
    }

    public function getActiveDiscountPercentAttribute(): float
    {
        return $this->getActiveDiscountPercent();
    }

    /**
     * Get the shop name from the related shop.
     *
     * @return string|null
     */
    public function getShopNameAttribute()
    {
        return $this->shop ? $this->shop->shop_name : null;
    }
}
