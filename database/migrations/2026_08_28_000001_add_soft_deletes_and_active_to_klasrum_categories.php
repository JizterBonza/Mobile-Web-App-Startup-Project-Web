<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('klasrum_categories', function (Blueprint $table) {
            $table->unsignedTinyInteger('active')->default(1)->after('name');
            $table->softDeletes();
            $table->dropUnique(['name']);
            $table->index('name');
            $table->index('active');
        });

        DB::table('klasrum_categories')->update(['active' => 1]);
    }

    public function down(): void
    {
        Schema::table('klasrum_categories', function (Blueprint $table) {
            $table->dropIndex(['name']);
            $table->dropIndex(['active']);
            $table->dropSoftDeletes();
            $table->dropColumn('active');
            $table->unique('name');
        });
    }
};
