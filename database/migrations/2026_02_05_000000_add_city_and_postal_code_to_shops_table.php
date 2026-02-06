<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            if (!Schema::hasColumn('shops', 'shop_city')) {
                $table->string('shop_city', 100)->nullable()->after('shop_address');
            }
            if (!Schema::hasColumn('shops', 'shop_postal_code')) {
                $table->string('shop_postal_code', 20)->nullable()->after('shop_city');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            if (Schema::hasColumn('shops', 'shop_city')) {
                $table->dropColumn('shop_city');
            }
            if (Schema::hasColumn('shops', 'shop_postal_code')) {
                $table->dropColumn('shop_postal_code');
            }
        });
    }
};
