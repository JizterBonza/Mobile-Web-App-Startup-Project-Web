<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('gamefowl_lookups', 'rate')) {
            Schema::table('gamefowl_lookups', function (Blueprint $table) {
                $table->decimal('rate', 5, 2)->nullable()->after('description');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('gamefowl_lookups', 'rate')) {
            Schema::table('gamefowl_lookups', function (Blueprint $table) {
                $table->dropColumn('rate');
            });
        }
    }
};
