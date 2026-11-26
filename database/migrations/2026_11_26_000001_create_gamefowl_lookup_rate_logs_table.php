<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gamefowl_lookup_rate_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gamefowl_lookup_id')->constrained('gamefowl_lookups')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('old_rate', 5, 2)->nullable();
            $table->decimal('new_rate', 5, 2);
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->timestamps();

            $table->index(['gamefowl_lookup_id', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gamefowl_lookup_rate_logs');
    }
};
