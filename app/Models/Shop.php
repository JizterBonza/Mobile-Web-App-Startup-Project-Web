<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Shop extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'shops';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'agrivet_id',
        'shop_name',
        'shop_description',
        'shop_address',
        'shop_lat',
        'shop_long',
        'contact_number',
        'average_rating',
        'total_reviews',
        'shop_status',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'shop_lat' => 'decimal:7',
            'shop_long' => 'decimal:7',
            'average_rating' => 'decimal:2',
            'total_reviews' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the agrivet that owns the shop.
     */
    public function agrivet()
    {
        return $this->belongsTo(Agrivet::class);
    }

    /**
     * Get the items for the shop.
     */
    public function items()
    {
        return $this->hasMany(Item::class);
    }

    /**
     * Get the reviews for the shop.
     */
    public function ratingReviews()
    {
        return $this->hasMany(RatingReview::class);
    }

    /**
     * Get the vendors (users) associated with this shop.
     */
    public function vendors()
    {
        return $this->belongsToMany(User::class, 'agrivet_vendor', 'shop_id', 'vendor_id')
            ->withPivot('agrivet_id', 'status')
            ->withTimestamps();
    }
}

