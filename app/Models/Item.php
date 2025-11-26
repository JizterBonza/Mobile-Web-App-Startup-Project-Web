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
        'item_name',
        'item_description',
        'item_price',
        'item_quantity',
        'category',
        'item_images',
        'item_status',
        'average_rating',
        'total_reviews',
        'sold_count',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'item_price' => 'decimal:2',
            'item_quantity' => 'integer',
            'item_images' => 'array',
            'average_rating' => 'decimal:2',
            'total_reviews' => 'integer',
            'sold_count' => 'integer',
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
     * Get the rating reviews for the item.
     */
    public function ratingReviews()
    {
        return $this->hasMany(RatingReview::class);
    }
}

