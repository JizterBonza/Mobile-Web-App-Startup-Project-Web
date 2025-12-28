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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('type'); // 'order_placed', 'order_shipped', 'payment_received', etc.
            $table->string('category')->default('general'); // 'order', 'payment', 'promo', 'system'
            $table->string('title');
            $table->text('message');
            $table->nullableMorphs('reference'); // reference_type, reference_id (links to Order, Item, Shop, etc.)
            $table->json('data')->nullable(); // extra context
            $table->boolean('read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->string('action_url')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'read', 'created_at']);
            $table->index(['user_id', 'category']);
            // Note: nullableMorphs() already creates an index on reference_type and reference_id
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};