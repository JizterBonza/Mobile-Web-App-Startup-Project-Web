<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\SubCategory;

class ProductCatalog extends Model
{
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
    ];

    protected $casts = [
        'images' => 'array',
    ];

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
}
