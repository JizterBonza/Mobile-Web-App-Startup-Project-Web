<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('category', function (Blueprint $table) {
            $table->id()->primary();
            $table->string('category_name', 100)->unique();
            $table->text('category_description')->nullable();
            $table->string('category_image_url', 255)->nullable();
            $table->string('status', 50)->default('active');
            $table->timestamps();
        });
    }
};
