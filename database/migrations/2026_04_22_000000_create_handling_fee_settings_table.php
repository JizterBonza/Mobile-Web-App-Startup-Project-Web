<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('handling_fee_settings')) {
            Schema::create('handling_fee_settings', function (Blueprint $table) {
                $table->id();

                // Fee formula parameters (mirrors OrderController::calculateHandlingFee)
                $table->decimal('free_until_kg', 8, 3);
                $table->decimal('base_fee', 10, 2);
                $table->decimal('increment_threshold_kg', 8, 3);
                $table->decimal('increment_block_kg', 8, 3);
                $table->decimal('increment_fee_per_block', 10, 2);
                $table->decimal('max_fee', 10, 2);

                // Lifecycle: only rows with status = 'active' are loaded by the calculator.
                // 'archived' rows are kept for history and quick revert; 'draft' is staged.
                $table->enum('status', ['active', 'archived', 'draft'])->default('draft');

                // Human-readable reason or label for this version (audit context).
                $table->text('note')->nullable();

                $table->timestamps();

                $table->index('status');
            });
        }

        // Seed one active row matching the previously hardcoded values so behavior is unchanged.
        $exists = DB::table('handling_fee_settings')->where('status', 'active')->exists();
        if (!$exists) {
            DB::table('handling_fee_settings')->insert([
                'free_until_kg' => 25.000,
                'base_fee' => 50.00,
                'increment_threshold_kg' => 100.000,
                'increment_block_kg' => 10.000,
                'increment_fee_per_block' => 15.00,
                'max_fee' => 150.00,
                'status' => 'active',
                'note' => 'Initial seed from OrderController hardcoded tiers',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('handling_fee_settings');
    }
};
