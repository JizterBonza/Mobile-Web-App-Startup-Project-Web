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
            // Store Name - already exists as 'name', but we'll keep it
            // Registered Business Name
            if (!Schema::hasColumn('agrivets', 'registered_business_name')) {
                $table->string('registered_business_name', 255)->nullable()->after('name');
            }
            // Owner/Point of Contact Person Name
            if (!Schema::hasColumn('agrivets', 'owner_name')) {
                $table->string('owner_name', 255)->nullable()->after('registered_business_name');
            }
            // Address (re-adding as it was removed in a previous migration)
            if (!Schema::hasColumn('agrivets', 'address')) {
                $table->text('address')->nullable()->after('owner_name');
            }
            // Necessary Permits
            if (!Schema::hasColumn('agrivets', 'permits')) {
                $table->text('permits')->nullable()->after('address');
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
            if (Schema::hasColumn('agrivets', 'registered_business_name')) {
                $columnsToDrop[] = 'registered_business_name';
            }
            if (Schema::hasColumn('agrivets', 'owner_name')) {
                $columnsToDrop[] = 'owner_name';
            }
            if (Schema::hasColumn('agrivets', 'address')) {
                $columnsToDrop[] = 'address';
            }
            if (Schema::hasColumn('agrivets', 'permits')) {
                $columnsToDrop[] = 'permits';
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
