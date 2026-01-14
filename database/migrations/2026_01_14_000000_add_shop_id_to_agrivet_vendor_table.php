<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Step 1: Try to drop foreign keys first (they may not exist)
        try {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->dropForeign(['agrivet_id']);
            });
        } catch (\Exception $e) {
            // Foreign key may not exist
        }

        try {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->dropForeign(['vendor_id']);
            });
        } catch (\Exception $e) {
            // Foreign key may not exist
        }

        // Step 2: Try to drop the old unique constraint
        try {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->dropUnique(['agrivet_id', 'vendor_id']);
            });
        } catch (\Exception $e) {
            // Unique constraint may not exist
        }

        // Step 3: Add shop_id column if it doesn't exist
        if (!Schema::hasColumn('agrivet_vendor', 'shop_id')) {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->unsignedBigInteger('shop_id')->nullable()->after('agrivet_id');
            });

            // Add foreign key for shop_id
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->foreign('shop_id')->references('id')->on('shops')->onDelete('cascade');
            });
        }

        // Step 4: Re-add the foreign keys if they don't exist
        try {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->foreign('agrivet_id')->references('id')->on('agrivets')->onDelete('cascade');
            });
        } catch (\Exception $e) {
            // Foreign key may already exist
        }

        try {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->foreign('vendor_id')->references('id')->on('users')->onDelete('cascade');
            });
        } catch (\Exception $e) {
            // Foreign key may already exist
        }

        // Step 5: Add new unique constraint
        try {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->unique(['shop_id', 'vendor_id']);
            });
        } catch (\Exception $e) {
            // Unique constraint may already exist
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Step 1: Try to drop foreign keys
        try {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->dropForeign(['shop_id']);
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->dropForeign(['agrivet_id']);
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->dropForeign(['vendor_id']);
            });
        } catch (\Exception $e) {}

        // Step 2: Try to drop the new unique constraint
        try {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->dropUnique(['shop_id', 'vendor_id']);
            });
        } catch (\Exception $e) {}

        // Step 3: Remove shop_id column if it exists
        if (Schema::hasColumn('agrivet_vendor', 'shop_id')) {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->dropColumn('shop_id');
            });
        }

        // Step 4: Re-add original foreign keys
        try {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->foreign('agrivet_id')->references('id')->on('agrivets')->onDelete('cascade');
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->foreign('vendor_id')->references('id')->on('users')->onDelete('cascade');
            });
        } catch (\Exception $e) {}

        // Step 5: Restore the old unique constraint
        try {
            Schema::table('agrivet_vendor', function (Blueprint $table) {
                $table->unique(['agrivet_id', 'vendor_id']);
            });
        } catch (\Exception $e) {}
    }
};
