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
        if (!Schema::hasTable('user_credentials')) {
            Schema::create('user_credentials', function (Blueprint $table) {
            $table->id(); // Primary key (auto increment)

            $table->string('username', 100)->unique();
            $table->string('password_hash', 255);
            $table->string('reset_token', 255)->nullable();
            $table->timestamp('reset_token_expires')->nullable();
            $table->timestamp('last_login')->nullable();

            $table->timestamps(); // created_at, updated_at
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_credentials');
    }
};
