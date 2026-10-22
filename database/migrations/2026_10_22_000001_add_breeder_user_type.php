<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql' && Schema::hasColumn('users', 'user_type')) {
            DB::statement(
                "ALTER TABLE users MODIFY COLUMN user_type ENUM('super_admin','admin','vendor','veterinarian','customer','rider','owner_manager','breeder') NOT NULL DEFAULT 'vendor'"
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql' && Schema::hasColumn('users', 'user_type')) {
            DB::table('users')->where('user_type', 'breeder')->update(['user_type' => 'customer']);

            DB::statement(
                "ALTER TABLE users MODIFY COLUMN user_type ENUM('super_admin','admin','vendor','veterinarian','customer','rider','owner_manager') NOT NULL DEFAULT 'vendor'"
            );
        }
    }
};
