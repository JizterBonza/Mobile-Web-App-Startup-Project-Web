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
        // Update agrivets table - remove address, latitude, longitude if they exist
        Schema::table('agrivets', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('agrivets', 'address')) {
                $columnsToDrop[] = 'address';
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

        // Update shops table - remove user_id, logo_url and add agrivet_id
        Schema::table('shops', function (Blueprint $table) {
            // Add agrivet_id as nullable first to handle existing data
            if (!Schema::hasColumn('shops', 'agrivet_id')) {
                $table->unsignedBigInteger('agrivet_id')->nullable()->after('id');
            }

            // Drop columns that are no longer needed
            $columnsToDrop = [];
            if (Schema::hasColumn('shops', 'user_id')) {
                $columnsToDrop[] = 'user_id';
            }
            if (Schema::hasColumn('shops', 'logo_url')) {
                $columnsToDrop[] = 'logo_url';
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });

        // Add foreign key constraint in a separate statement
        if (Schema::hasColumn('shops', 'agrivet_id')) {
            try {
                Schema::table('shops', function (Blueprint $table) {
                    $table->foreign('agrivet_id')->references('id')->on('agrivets')->onDelete('cascade');
                });
            } catch (\Exception $e) {
                // Foreign key may already exist, ignore the error
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverse shops table changes
        Schema::table('shops', function (Blueprint $table) {
            // Try to drop foreign key if it exists
            try {
                $table->dropForeign(['agrivet_id']);
            } catch (\Exception $e) {
                // Foreign key may not exist, ignore the error
            }
        });

        Schema::table('shops', function (Blueprint $table) {
            if (Schema::hasColumn('shops', 'agrivet_id')) {
                $table->dropColumn('agrivet_id');
            }

            // Re-add removed columns if they don't exist
            if (!Schema::hasColumn('shops', 'user_id')) {
                $table->unsignedBigInteger('user_id')->after('id');
            }
            if (!Schema::hasColumn('shops', 'logo_url')) {
                $table->string('logo_url', 255)->nullable()->after('contact_number');
            }
        });

        // Reverse agrivets table changes
        Schema::table('agrivets', function (Blueprint $table) {
            if (!Schema::hasColumn('agrivets', 'address')) {
                $table->string('address', 255)->nullable()->after('description');
            }
            if (!Schema::hasColumn('agrivets', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable()->after('address');
            }
            if (!Schema::hasColumn('agrivets', 'longitude')) {
                $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            }
        });
    }
};
