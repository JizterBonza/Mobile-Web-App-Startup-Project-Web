<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProofOfDeliveryImage extends Model
{
    protected $fillable = [
        'proof_of_delivery_id',
        'image_path',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function proofOfDelivery()
    {
        return $this->belongsTo(ProofOfDelivery::class);
    }
}
