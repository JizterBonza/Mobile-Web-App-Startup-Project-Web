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
            if (!Schema::hasColumn('agrivets', 'city')) {
                $table->string('city', 100)->nullable()->after('address');
            }
            if (!Schema::hasColumn('agrivets', 'postal_code')) {
                $table->string('postal_code', 10)->nullable()->after('city');
            }
            if (!Schema::hasColumn('agrivets', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable()->after('postal_code');
            }
            if (!Schema::hasColumn('agrivets', 'longitude')) {
                $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agrivets', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('agrivets', 'city')) {
                $columnsToDrop[] = 'city';
            }
            if (Schema::hasColumn('agrivets', 'postal_code')) {
                $columnsToDrop[] = 'postal_code';
            }
            if (Schema::hasColumn('agrivets', 'latitude')) {
                $columnsToDrop[] = 'latitude';
            }
            if (Schema::hasColumn('agrivets', 'longitude')) {
                $columnsToDrop[] = 'longitude';
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
