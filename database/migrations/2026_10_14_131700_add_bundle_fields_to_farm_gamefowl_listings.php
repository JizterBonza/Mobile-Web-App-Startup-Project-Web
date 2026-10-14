<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('farm_gamefowl_listings', 'is_bundle')) {
            Schema::table('farm_gamefowl_listings', function (Blueprint $table) {
                $table->boolean('is_bundle')->default(false)->after('status');
                $table->string('bundle_name', 150)->nullable()->after('is_bundle');
                $table->string('bundle_type', 30)->nullable()->after('bundle_name');
                $table->json('bundle_catalog_ids')->nullable()->after('bundle_type');
            });
        }

        Schema::table('farm_gamefowl_listings', function (Blueprint $table) {
            $table->index('farm_id', 'farm_gamefowl_listings_farm_id_index');
        });

        Schema::table('farm_gamefowl_listings', function (Blueprint $table) {
            $table->dropUnique(['farm_id', 'gamefowl_catalog_id']);
        });
    }

    public function down(): void
    {
        Schema::table('farm_gamefowl_listings', function (Blueprint $table) {
            $table->unique(['farm_id', 'gamefowl_catalog_id']);
        });

        Schema::table('farm_gamefowl_listings', function (Blueprint $table) {
            $table->dropIndex('farm_gamefowl_listings_farm_id_index');
            $table->dropColumn(['is_bundle', 'bundle_name', 'bundle_type', 'bundle_catalog_ids']);
        });
    }
};
