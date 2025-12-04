<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
        'user_id',
        'shop_name',
        'shop_description',
        'shop_address',
        'shop_lat',
        'shop_long',
        'contact_number',
        'logo_url',
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
     * Get the user that owns the shop.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the items for the shop.
     */
    public function items()
    {
        return $this->hasMany(Item::class);
    }
}

