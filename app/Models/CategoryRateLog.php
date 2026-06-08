<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class CategoryRateLog extends Model
{
    protected $table = 'category_rate_logs';

    protected $fillable = [
        'category_id',
        'user_id',
        'old_rate',
        'new_rate',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'old_rate' => 'decimal:2',
            'new_rate' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function logChange(Category $category, ?float $oldRate, float $newRate): self
    {
        $request = request();

        return static::create([
            'category_id' => $category->id,
            'user_id' => Auth::id(),
            'old_rate' => $oldRate,
            'new_rate' => $newRate,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }
}
