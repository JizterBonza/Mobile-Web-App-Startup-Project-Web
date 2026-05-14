<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_catalog', function (Blueprint $table) {
            $table->id();
            $table->string('brand', 150)->nullable();
            $table->string('product_name', 150);
            $table->unsignedBigInteger('category_id')->nullable();
            $table->decimal('weight', 10, 3)->nullable();
            $table->string('unit', 50)->nullable();
            $table->text('description')->nullable();
            $table->json('images')->nullable();
            $table->unsignedTinyInteger('primary_image_index')->default(0);
            $table->string('status', 50)->default('active');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('category_id')->references('id')->on('category')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_catalog');
    }
};
