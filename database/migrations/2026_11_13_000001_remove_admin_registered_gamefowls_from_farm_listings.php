<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Take Super Admin and Admin catalog birds off every farm list.
     * Listings already on an order stay in order history and are marked removed.
     */
    public function up(): void
    {
        if (! Schema::hasTable('farm_gamefowl_listings') || ! Schema::hasTable('gamefowl_catalog') || ! Schema::hasTable('users')) {
            return;
        }

        $adminCatalogIds = DB::table('gamefowl_catalog')
            ->join('users', 'users.id', '=', 'gamefowl_catalog.created_by')
            ->whereIn('users.user_type', ['super_admin', 'admin'])
            ->pluck('gamefowl_catalog.id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($adminCatalogIds === []) {
            return;
        }

        $adminLookup = array_fill_keys($adminCatalogIds, true);
        $hasBundle = Schema::hasColumn('farm_gamefowl_listings', 'bundle_catalog_ids');
        $columns = ['id', 'gamefowl_catalog_id'];
        if ($hasBundle) {
            $columns[] = 'is_bundle';
            $columns[] = 'bundle_catalog_ids';
        }

        $removeIds = [];
        foreach (DB::table('farm_gamefowl_listings')->get($columns) as $listing) {
            $catalogIds = [(int) $listing->gamefowl_catalog_id];
            if ($hasBundle && ! empty($listing->is_bundle) && $listing->bundle_catalog_ids) {
                $decoded = is_array($listing->bundle_catalog_ids)
                    ? $listing->bundle_catalog_ids
                    : json_decode((string) $listing->bundle_catalog_ids, true);
                if (is_array($decoded)) {
                    foreach ($decoded as $id) {
                        $catalogIds[] = (int) $id;
                    }
                }
            }

            foreach ($catalogIds as $catalogId) {
                if (isset($adminLookup[$catalogId])) {
                    $removeIds[] = (int) $listing->id;
                    break;
                }
            }
        }

        if ($removeIds === []) {
            return;
        }

        DB::transaction(function () use ($removeIds) {
            if (Schema::hasTable('farm_cart_items')) {
                DB::table('farm_cart_items')->whereIn('listing_id', $removeIds)->delete();
            }

            $orderedIds = [];
            if (Schema::hasTable('farm_order_items')) {
                $orderedIds = DB::table('farm_order_items')
                    ->whereIn('listing_id', $removeIds)
                    ->pluck('listing_id')
                    ->map(fn ($id) => (int) $id)
                    ->unique()
                    ->values()
                    ->all();
            }

            $deleteIds = array_values(array_diff($removeIds, $orderedIds));

            if ($orderedIds !== []) {
                DB::table('farm_gamefowl_listings')
                    ->whereIn('id', $orderedIds)
                    ->update([
                        'status' => 'removed',
                        'updated_at' => now(),
                    ]);
            }

            if ($deleteIds !== []) {
                DB::table('farm_gamefowl_listings')->whereIn('id', $deleteIds)->delete();
            }
        });
    }

    public function down(): void
    {
        // Removed farm listings are not restored.
    }
};
