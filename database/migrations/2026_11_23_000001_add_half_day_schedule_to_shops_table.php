<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One operating day can use shorter hours than the standard schedule.
     * Stored as "Sunday|06:00|08:00".
     */
    public function up(): void
    {
        if (Schema::hasTable('shops') && ! Schema::hasColumn('shops', 'half_day_schedule')) {
            Schema::table('shops', function (Blueprint $table) {
                $table->string('half_day_schedule', 40)->nullable()->after('operating_hours');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('shops') && Schema::hasColumn('shops', 'half_day_schedule')) {
            Schema::table('shops', function (Blueprint $table) {
                $table->dropColumn('half_day_schedule');
            });
        }
    }
};
