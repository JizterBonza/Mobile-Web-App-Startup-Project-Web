<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN user_type ENUM('super_admin','admin','vendor','veterinarian','customer','rider','owner_manager','breeder','shipping_partner') NOT NULL DEFAULT 'vendor'");
        }

        Schema::table('farm_gamefowl_listings', function (Blueprint $table) {
            $table->unsignedInteger('reserved_stock')->default(0);
        });
        Schema::table('order_details', function (Blueprint $table) {
            $table->decimal('shipping_fee', 10, 2)->nullable()->change();
            $table->decimal('total_amount', 10, 2)->nullable()->change();
        });
        Schema::table('payments', function (Blueprint $table) {
            $table->string('purpose', 30)->nullable()->index();
            $table->unsignedInteger('schedule_version')->nullable();
            $table->uuid('attempt_key')->nullable()->unique();
        });

        Schema::create('farm_cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('listing_id')->constrained('farm_gamefowl_listings')->cascadeOnDelete();
            $table->unsignedInteger('quantity');
            $table->timestamps();
            $table->unique(['user_id', 'listing_id']);
        });
        Schema::create('farm_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('customer_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('farm_id')->constrained()->restrictOnDelete();
            $table->foreignId('shipping_partner_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('idempotency_key', 100);
            $table->string('request_hash', 64);
            $table->string('fulfillment_method', 20);
            $table->string('status', 40)->default('awaiting_deposit')->index();
            $table->string('inventory_state', 20)->default('reserved');
            $table->json('farm_snapshot');
            $table->json('address_snapshot')->nullable();
            $table->unsignedInteger('bird_count');
            $table->unsignedInteger('box_count');
            $table->unsignedBigInteger('subtotal_cents');
            $table->unsignedBigInteger('deposit_cents');
            $table->unsignedBigInteger('estimate_min_cents');
            $table->unsignedBigInteger('estimate_max_cents');
            $table->unsignedBigInteger('per_box_cents')->nullable();
            $table->unsignedBigInteger('shipping_cents')->nullable();
            $table->unsignedBigInteger('total_cents')->nullable();
            $table->date('earliest_release_date');
            $table->date('pickup_date')->nullable()->index();
            $table->timestamp('balance_opens_at')->nullable();
            $table->timestamp('balance_due_at')->nullable()->index();
            $table->unsignedInteger('schedule_version')->default(0);
            $table->timestamp('deposit_paid_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('fully_paid_at')->nullable();
            $table->timestamp('release_authorized_at')->nullable();
            $table->timestamp('held_at')->nullable();
            $table->string('hold_reason')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->unique(['customer_id', 'idempotency_key']);
        });
        Schema::create('farm_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('listing_id')->constrained('farm_gamefowl_listings')->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('bird_count');
            $table->unsignedBigInteger('unit_price_cents');
            $table->json('snapshot');
            $table->timestamps();
        });
        Schema::create('farm_order_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event');
            $table->unsignedInteger('schedule_version')->default(0);
            $table->json('data')->nullable();
            $table->timestamps();
        });
        Schema::create('farm_order_notices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('event');
            $table->unsignedInteger('schedule_version');
            $table->timestamps();
            $table->unique(['farm_order_id', 'user_id', 'event', 'schedule_version'], 'farm_notice_once');
        });
    }

    public function down(): void
    {
        foreach (['farm_order_notices', 'farm_order_events', 'farm_order_items', 'farm_orders', 'farm_cart_items'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique(['attempt_key']);
            $table->dropIndex(['purpose']);
            $table->dropColumn(['purpose', 'schedule_version', 'attempt_key']);
        });
        Schema::table('farm_gamefowl_listings', fn (Blueprint $table) => $table->dropColumn('reserved_stock'));
        // Nullable legacy totals and the additive role remain rollback-compatible;
        // changing them back would invalidate existing orders and partner accounts.
    }
};
