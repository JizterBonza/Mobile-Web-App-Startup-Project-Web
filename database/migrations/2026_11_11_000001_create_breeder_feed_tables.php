<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('breeder_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('breeder_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('body');
            $table->string('status', 20)->default('published');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['status', 'published_at', 'id']);
            $table->index(['breeder_id', 'status', 'published_at', 'id']);
        });

        Schema::create('breeder_post_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('breeder_post_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->unsignedTinyInteger('position');
            $table->timestamps();
            $table->unique(['breeder_post_id', 'position']);
        });

        Schema::create('breeder_post_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('breeder_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['breeder_post_id', 'user_id']);
        });

        Schema::create('breeder_post_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('breeder_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
            $table->softDeletes();
            $table->index(['breeder_post_id', 'created_at', 'id']);
        });

        Schema::create('breeder_follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('follower_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('breeder_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['follower_id', 'breeder_id']);
            $table->index('breeder_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('breeder_follows');
        Schema::dropIfExists('breeder_post_comments');
        Schema::dropIfExists('breeder_post_likes');
        Schema::dropIfExists('breeder_post_images');
        Schema::dropIfExists('breeder_posts');
    }
};
