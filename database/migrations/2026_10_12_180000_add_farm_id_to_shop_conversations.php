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

        $this->dropShopForeignKeys();

        Schema::table('shop_conversations', function (Blueprint $table) {
            $table->unsignedBigInteger('shop_id')->nullable()->change();
        });

        $hasShopCustomerUnique = Schema::hasIndex('shop_conversations', 'shop_conv_shop_customer_unique');

        Schema::table('shop_conversations', function (Blueprint $table) use ($hasShopCustomerUnique) {
            $table->foreignId('farm_id')->nullable()->after('shop_id')->constrained('farms')->cascadeOnDelete();
            $table->foreign('shop_id')->references('id')->on('shops')->cascadeOnDelete();

            if (! $hasShopCustomerUnique) {
                $table->unique(['shop_id', 'customer_user_id'], 'shop_conv_shop_customer_unique');
            }

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

        $this->dropShopForeignKeys();

        Schema::table('shop_conversations', function (Blueprint $table) {
            $table->dropIndex('shop_conv_farm_last_msg_idx');
            $table->dropUnique('shop_conv_farm_customer_unique');
            $table->dropConstrainedForeignId('farm_id');
        });

        Schema::table('shop_conversations', function (Blueprint $table) {
            $table->unsignedBigInteger('shop_id')->nullable(false)->change();
            $table->foreign('shop_id')->references('id')->on('shops')->cascadeOnDelete();
        });
    }

    private function dropShopForeignKeys(): void
    {
        foreach (Schema::getForeignKeys('shop_conversations') as $foreignKey) {
            if ($foreignKey['columns'] !== ['shop_id']) {
                continue;
            }

            Schema::table('shop_conversations', function (Blueprint $table) use ($foreignKey) {
                $table->dropForeign($foreignKey['name'] ?? $foreignKey['columns']);
            });
        }
    }
};
