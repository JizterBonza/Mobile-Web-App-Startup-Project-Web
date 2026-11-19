<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Farm registration stores a street plus barangay, and a phone up to 30 characters.
     */
    public function up(): void
    {
        if (Schema::hasTable('farms') && Schema::hasColumn('farms', 'address')) {
            DB::statement('ALTER TABLE farms MODIFY address VARCHAR(500) NULL');
        }

        if (Schema::hasTable('user_details') && Schema::hasColumn('user_details', 'mobile_number')) {
            DB::statement('ALTER TABLE user_details MODIFY mobile_number VARCHAR(30) NULL');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('farms') && Schema::hasColumn('farms', 'address')) {
            DB::statement('ALTER TABLE farms MODIFY address VARCHAR(255) NULL');
        }

        if (Schema::hasTable('user_details') && Schema::hasColumn('user_details', 'mobile_number')) {
            DB::statement('ALTER TABLE user_details MODIFY mobile_number VARCHAR(20) NULL');
        }
    }
};
