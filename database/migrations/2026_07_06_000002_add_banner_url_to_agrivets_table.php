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
        Schema::table('agrivets', function (Blueprint $table) {
            if (!Schema::hasColumn('agrivets', 'banner_url')) {
                $table->string('banner_url', 255)->nullable()->after('logo_url');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agrivets', function (Blueprint $table) {
            if (Schema::hasColumn('agrivets', 'banner_url')) {
                $table->dropColumn('banner_url');
            }
        });
    }
};
