<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gamefowl_lookups', function (Blueprint $table) {
            $table->id();
            $table->string('type', 30);
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('status', 50)->default('active');
            $table->timestamps();

            $table->unique(['type', 'name']);
        });

        Schema::create('gamefowl_catalog', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->unsignedBigInteger('bloodline_id')->nullable();
            $table->unsignedBigInteger('age_type_id')->nullable();
            $table->unsignedBigInteger('class_id')->nullable();
            $table->text('description')->nullable();
            $table->json('images')->nullable();
            $table->unsignedTinyInteger('primary_image_index')->default(0);
            $table->string('status', 50)->default('active');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->foreign('bloodline_id')->references('id')->on('gamefowl_lookups')->nullOnDelete();
            $table->foreign('age_type_id')->references('id')->on('gamefowl_lookups')->nullOnDelete();
            $table->foreign('class_id')->references('id')->on('gamefowl_lookups')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gamefowl_catalog');
        Schema::dropIfExists('gamefowl_lookups');
    }
};
