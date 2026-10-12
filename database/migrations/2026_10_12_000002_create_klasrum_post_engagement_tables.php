<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('klasrum_follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('follower_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('following_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['follower_id', 'following_id']);
        });

        Schema::create('klasrum_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('klasrum_content_id')->constrained('klasrum_contents')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 20)->default('like');
            $table->timestamps();

            $table->unique(['user_id', 'klasrum_content_id']);
        });

        Schema::create('klasrum_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('klasrum_content_id')->constrained('klasrum_contents')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();

            $table->index(['klasrum_content_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('klasrum_comments');
        Schema::dropIfExists('klasrum_reactions');
        Schema::dropIfExists('klasrum_follows');
    }
};
