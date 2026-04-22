<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'agrivet_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('agrivet_id')->nullable()->after('user_type')->constrained('agrivets')->nullOnDelete();
            });
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql' && Schema::hasColumn('users', 'user_type')) {
            DB::statement(
                "ALTER TABLE users MODIFY COLUMN user_type ENUM('super_admin','admin','vendor','veterinarian','customer','rider','owner_manager') NOT NULL DEFAULT 'vendor'"
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('users', 'agrivet_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['agrivet_id']);
                $table->dropColumn('agrivet_id');
            });
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql' && Schema::hasColumn('users', 'user_type')) {
            DB::statement(
                "ALTER TABLE users MODIFY COLUMN user_type ENUM('super_admin','admin','vendor','veterinarian','customer','rider') NOT NULL DEFAULT 'vendor'"
            );
        }
    }
};
