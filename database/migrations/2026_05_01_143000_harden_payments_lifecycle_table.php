<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'raw_payload')) {
                $table->json('raw_payload')->nullable()->after('metadata');
            }

            if (!Schema::hasColumn('payments', 'paid_at')) {
                $table->timestamp('paid_at')->nullable()->after('status');
            }
        });

        $this->ensureIndex('payments', 'payments_order_id_idx', 'order_id');
        $this->ensureIndex('payments', 'payments_checkout_session_id_idx', 'checkout_session_id');
        $this->ensureIndex('payments', 'payments_payment_intent_id_idx', 'payment_intent_id');

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE `payments`
                 MODIFY `status` ENUM(
                    'pending',
                    'paid',
                    'failed',
                    'expired',
                    'cancelled',
                    'refunded',
                    'partially_refunded'
                 ) NOT NULL DEFAULT 'pending'"
            );
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE `payments`
                 MODIFY `status` ENUM(
                    'pending',
                    'paid',
                    'failed',
                    'refunded',
                    'partially_refunded'
                 ) NOT NULL DEFAULT 'pending'"
            );
        }

        $this->dropIndexIfExists('payments', 'payments_order_id_idx');
        $this->dropIndexIfExists('payments', 'payments_checkout_session_id_idx');
        $this->dropIndexIfExists('payments', 'payments_payment_intent_id_idx');

        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'raw_payload')) {
                $table->dropColumn('raw_payload');
            }

            if (Schema::hasColumn('payments', 'paid_at')) {
                $table->dropColumn('paid_at');
            }
        });
    }

    private function ensureIndex(string $table, string $indexName, string $column): void
    {
        if (!$this->indexExists($table, $indexName)) {
            Schema::table($table, function (Blueprint $blueprint) use ($column, $indexName) {
                $blueprint->index($column, $indexName);
            });
        }
    }

    private function dropIndexIfExists(string $table, string $indexName): void
    {
        if ($this->indexExists($table, $indexName)) {
            Schema::table($table, function (Blueprint $blueprint) use ($indexName) {
                $blueprint->dropIndex($indexName);
            });
        }
    }

    private function indexExists(string $table, string $indexName): bool
    {
        return match (Schema::getConnection()->getDriverName()) {
            'mysql' => !empty(DB::select(
                'SHOW INDEX FROM `' . $table . '` WHERE Key_name = ?',
                [$indexName]
            )),
            'sqlite' => !empty(DB::select(
                "PRAGMA index_list('" . $table . "')"
            )) && collect(DB::select("PRAGMA index_list('" . $table . "')"))
                ->pluck('name')
                ->contains($indexName),
            default => false,
        };
    }
};
