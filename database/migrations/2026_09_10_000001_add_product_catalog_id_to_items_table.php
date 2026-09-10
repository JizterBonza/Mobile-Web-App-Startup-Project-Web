<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('items', 'product_catalog_id')) {
            Schema::table('items', function (Blueprint $table) {
                $table->unsignedBigInteger('product_catalog_id')->nullable()->after('shop_id');
                $table->index('product_catalog_id');
            });
        }

        $catalogs = DB::table('product_catalog')
            ->whereIn('status', ['active', 'inactive'])
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
            ->orderBy('id')
            ->get()
            ->unique('product_name');

        foreach ($catalogs as $catalog) {
            $images = $this->listingImages($catalog);

            $update = [
                'product_catalog_id' => $catalog->id,
                'item_name' => $catalog->product_name,
                'item_description' => $catalog->description,
                'weight' => $catalog->weight,
                'metric' => $catalog->unit,
                'category' => $catalog->category_id,
                'sub_category_id' => $catalog->sub_category_id,
                'updated_at' => now(),
            ];

            if (! empty($images)) {
                $update['item_images'] = json_encode($images);
            }

            DB::table('items')
                ->whereNull('product_catalog_id')
                ->where('item_name', $catalog->product_name)
                ->where(function ($q) {
                    $q->where('is_bundle', false)->orWhereNull('is_bundle');
                })
                ->update($update);
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('items', 'product_catalog_id')) {
            return;
        }

        Schema::table('items', function (Blueprint $table) {
            $table->dropIndex(['product_catalog_id']);
            $table->dropColumn('product_catalog_id');
        });
    }

    /**
     * @return list<string>
     */
    private function listingImages(object $catalog): array
    {
        $images = json_decode($catalog->images ?? '[]', true);
        if (! is_array($images)) {
            return [];
        }

        $images = array_values(array_filter(
            $images,
            fn ($image) => is_string($image) && $image !== ''
        ));

        $primary = (int) ($catalog->primary_image_index ?? 0);
        if ($primary > 0 && array_key_exists($primary, $images)) {
            $primaryImage = $images[$primary];
            unset($images[$primary]);
            array_unshift($images, $primaryImage);
            $images = array_values($images);
        }

        return $images;
    }
};
