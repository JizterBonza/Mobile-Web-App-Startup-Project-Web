<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('districts', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->json('boundary');
            $table->boolean('status')->default(true);
            $table->timestamps();
        });

        Schema::table('zones', function (Blueprint $table) {
            $table->foreignId('district_id')
                ->nullable()
                ->after('id')
                ->constrained('districts')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('zones', function (Blueprint $table) {
            $table->dropConstrainedForeignId('district_id');
        });

        Schema::dropIfExists('districts');
    }
};
