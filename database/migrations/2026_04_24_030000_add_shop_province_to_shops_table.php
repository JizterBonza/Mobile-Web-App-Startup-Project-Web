<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('shops')) {
            return;
        }

        Schema::table('shops', function (Blueprint $table) {
            if (! Schema::hasColumn('shops', 'shop_province')) {
                if (Schema::hasColumn('shops', 'shop_postal_code')) {
                    $table->string('shop_province', 100)->nullable()->after('shop_postal_code');
                } else {
                    $table->string('shop_province', 100)->nullable();
                }
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('shops') || ! Schema::hasColumn('shops', 'shop_province')) {
            return;
        }

        Schema::table('shops', function (Blueprint $table) {
            $table->dropColumn('shop_province');
        });
    }
};
