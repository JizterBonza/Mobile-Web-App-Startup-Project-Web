<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    private const BRAND = 'Agrify Demo';

    private const PRODUCT_NAME = 'Demo Chick Booster 1kg';

    private const CATEGORY_NAME = 'Feeds';

    private const SUB_CATEGORY_NAME = 'Heavy but small';

    private const UNIT = 'kg';

    private const WEIGHT = 1.000;

    private const DESCRIPTION = 'Seeded demo product registered in the platform product catalog.';

    private const IMAGE_DIR = 'product-catalog/demo-chick-booster';

    /**
     * 1×1 PNG used as a placeholder catalog image.
     */
    private const PLACEHOLDER_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $now = now();

        $exists = DB::table('product_catalog')
            ->where('product_name', self::PRODUCT_NAME)
            ->where('brand', self::BRAND)
            ->exists();

        if ($exists) {
            return;
        }

        $categoryId = $this->ensureCategory($now);
        $subCategoryId = DB::table('sub_categories')
            ->where('sub_category_name', self::SUB_CATEGORY_NAME)
            ->value('id');
        $adminId = DB::table('users')
            ->where('user_type', 'super_admin')
            ->orderBy('id')
            ->value('id');

        $images = $this->ensurePlaceholderImages();

        DB::table('product_catalog')->insert([
            'brand' => self::BRAND,
            'product_name' => self::PRODUCT_NAME,
            'category_id' => $categoryId,
            'sub_category_id' => $subCategoryId,
            'weight' => self::WEIGHT,
            'unit' => self::UNIT,
            'description' => self::DESCRIPTION,
            'images' => json_encode($images),
            'primary_image_index' => 0,
            'status' => 'active',
            'created_by' => $adminId,
            'reviewed_by' => $adminId,
            'reviewed_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('product_catalog')
            ->where('product_name', self::PRODUCT_NAME)
            ->where('brand', self::BRAND)
            ->delete();

        Storage::disk('public')->deleteDirectory(self::IMAGE_DIR);

        $categoryId = DB::table('category')
            ->where('category_name', self::CATEGORY_NAME)
            ->value('id');

        if ($categoryId && ! DB::table('product_catalog')->where('category_id', $categoryId)->exists()) {
            DB::table('category')->where('id', $categoryId)->delete();
        }
    }

    private function ensureCategory($now): ?int
    {
        $existingId = DB::table('category')
            ->where('category_name', self::CATEGORY_NAME)
            ->value('id');

        if ($existingId) {
            return (int) $existingId;
        }

        return (int) DB::table('category')->insertGetId([
            'category_name' => self::CATEGORY_NAME,
            'category_description' => 'Animal feeds and related products.',
            'category_image_url' => null,
            'category_rate' => 5.00,
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /**
     * @return list<string>
     */
    private function ensurePlaceholderImages(): array
    {
        $disk = Storage::disk('public');
        $png = base64_decode(self::PLACEHOLDER_PNG_BASE64);
        $paths = [];

        for ($i = 1; $i <= 5; $i++) {
            $relative = self::IMAGE_DIR.'/image-'.$i.'.png';
            if (! $disk->exists($relative)) {
                $disk->put($relative, $png);
            }
            $paths[] = '/storage/'.$relative;
        }

        return $paths;
    }
};
