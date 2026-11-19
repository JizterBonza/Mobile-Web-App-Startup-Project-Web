<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('farm_gamefowl_listings', 'bundle_image')) {
            Schema::table('farm_gamefowl_listings', function (Blueprint $table) {
                $table->string('bundle_image', 2048)->nullable()->after('bundle_catalog_ids');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('farm_gamefowl_listings', 'bundle_image')) {
            Schema::table('farm_gamefowl_listings', function (Blueprint $table) {
                $table->dropColumn('bundle_image');
            });
        }
    }
};
