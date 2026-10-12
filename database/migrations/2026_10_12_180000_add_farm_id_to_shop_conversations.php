<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('shop_conversations') || Schema::hasColumn('shop_conversations', 'farm_id')) {
            return;
        }

        Schema::table('shop_conversations', function (Blueprint $table) {
            $table->dropForeign(['shop_id']);
            $table->dropUnique('shop_conv_shop_customer_unique');
        });

        DB::statement('ALTER TABLE shop_conversations MODIFY shop_id BIGINT UNSIGNED NULL');

        Schema::table('shop_conversations', function (Blueprint $table) {
            $table->foreignId('farm_id')->nullable()->after('shop_id')->constrained('farms')->cascadeOnDelete();
            $table->foreign('shop_id')->references('id')->on('shops')->cascadeOnDelete();
            $table->unique(['shop_id', 'customer_user_id'], 'shop_conv_shop_customer_unique');
            $table->unique(['farm_id', 'customer_user_id'], 'shop_conv_farm_customer_unique');
            $table->index(['farm_id', 'last_message_at'], 'shop_conv_farm_last_msg_idx');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('shop_conversations', 'farm_id')) {
            return;
        }

        DB::table('shop_conversations')->whereNull('shop_id')->delete();

        Schema::table('shop_conversations', function (Blueprint $table) {
            $table->dropIndex('shop_conv_farm_last_msg_idx');
            $table->dropUnique('shop_conv_farm_customer_unique');
            $table->dropUnique('shop_conv_shop_customer_unique');
            $table->dropForeign(['shop_id']);
            $table->dropConstrainedForeignId('farm_id');
        });

        DB::statement('ALTER TABLE shop_conversations MODIFY shop_id BIGINT UNSIGNED NOT NULL');

        Schema::table('shop_conversations', function (Blueprint $table) {
            $table->foreign('shop_id')->references('id')->on('shops')->cascadeOnDelete();
            $table->unique(['shop_id', 'customer_user_id'], 'shop_conv_shop_customer_unique');
        });
    }
};
