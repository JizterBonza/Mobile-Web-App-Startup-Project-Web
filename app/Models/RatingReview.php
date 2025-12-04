<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RatingReview extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'rating_reviews';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'item_id',
        'shop_id',
        'order_id',
        'rating',
        'review_text',
        'review_images',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'review_images' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the user that made the review.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the item that was reviewed.
     */
    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    /**
     * Get the order associated with the review.
     */
    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}

