<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gamefowl_catalog', function (Blueprint $table) {
            $table->string('sex', 50)->nullable()->after('class_id');
            $table->date('hatch_date')->nullable()->after('sex');
        });
    }

    public function down(): void
    {
        Schema::table('gamefowl_catalog', function (Blueprint $table) {
            $table->dropColumn(['sex', 'hatch_date']);
        });
    }
};
