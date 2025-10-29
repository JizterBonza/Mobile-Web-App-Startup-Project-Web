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
        Schema::create('users', function (Blueprint $table) {
            $table->id(); // Primary Key (int, auto increment)

            // Foreign Keys
            $table->unsignedBigInteger('user_detail_id');
            $table->unsignedBigInteger('user_credential_id');

            // Other columns
            $table->string('status', 100)->nullable();
            
            // Timestamps
            $table->timestamps();

            // Define foreign key constraints
            // $table->foreign('user_detail_id')->references('id')->on('user_details')->onDelete('cascade');
            // $table->foreign('user_credential_id')->references('id')->on('user_credentials')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
