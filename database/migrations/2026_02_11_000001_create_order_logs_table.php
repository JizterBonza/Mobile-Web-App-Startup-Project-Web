<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Order History / Lifecycle:
     * - Track order state changes (status transitions, payment, cancellation)
     * - Financial audit trail (amounts, payment refs)
     * - Reports & analytics (filter by event, date, order)
     * - Customer support history (who did what, when, notes)
     */
    public function up(): void
    {
        Schema::create('order_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');

            // Event / action type (e.g. status_changed, payment_received, cancelled, note_added)
            $table->string('event', 64);

            // State transition (nullable when event is not a status change)
            $table->string('from_status', 50)->nullable();
            $table->string('to_status', 50)->nullable();

            // Who triggered (user or system); nullable for system events
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');

            // Financial audit: snapshot of amount/currency at time of event
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('currency', 3)->nullable();
            $table->string('payment_reference', 255)->nullable();
            $table->string('payment_method', 50)->nullable();

            // Support & context
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();

            // Request context for audit
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 512)->nullable();

            $table->timestamps();

            $table->index(['order_id', 'created_at']);
            $table->index('event');
            $table->index('created_at');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_logs');
    }
};
