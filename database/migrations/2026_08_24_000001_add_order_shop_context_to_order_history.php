<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_logs', function (Blueprint $table) {
            $table->foreignId('order_shop_id')
                ->nullable()
                ->after('order_id')
                ->constrained('order_shops')
                ->cascadeOnDelete();
            $table->index(['order_shop_id', 'created_at']);
        });

        Schema::table('proof_of_delivery', function (Blueprint $table) {
            $table->foreignId('order_shop_id')
                ->nullable()
                ->after('order_id')
                ->constrained('order_shops')
                ->cascadeOnDelete();
            $table->unique('order_shop_id');
            $table->index(['order_shop_id', 'created_at']);
        });

        $singleLegByOrder = DB::table('order_shops')
            ->select('order_id', DB::raw('MIN(id) as order_shop_id'))
            ->groupBy('order_id')
            ->havingRaw('COUNT(*) = 1')
            ->pluck('order_shop_id', 'order_id');

        DB::table('order_logs')
            ->whereNull('order_shop_id')
            ->orderBy('id')
            ->chunkById(250, function ($logs) use ($singleLegByOrder) {
                foreach ($logs as $log) {
                    $orderShopId = $singleLegByOrder[$log->order_id] ?? null;
                    if ($orderShopId) {
                        DB::table('order_logs')->where('id', $log->id)->update([
                            'order_shop_id' => $orderShopId,
                        ]);
                    }
                }
            });

        $firstProofByOrder = DB::table('proof_of_delivery')
            ->select('order_id', DB::raw('MIN(id) as proof_id'))
            ->groupBy('order_id')
            ->pluck('proof_id', 'order_id');

        DB::table('proof_of_delivery')
            ->whereNull('order_shop_id')
            ->orderBy('id')
            ->chunkById(250, function ($proofs) use ($singleLegByOrder, $firstProofByOrder) {
                foreach ($proofs as $proof) {
                    $orderShopId = $singleLegByOrder[$proof->order_id] ?? null;
                    if ($orderShopId && (int) ($firstProofByOrder[$proof->order_id] ?? 0) === (int) $proof->id) {
                        DB::table('proof_of_delivery')->where('id', $proof->id)->update([
                            'order_shop_id' => $orderShopId,
                        ]);
                    }
                }
            });

        $now = now();
        DB::table('order_shops')
            ->join('order_status', 'order_status.id', '=', 'order_shops.order_status')
            ->select([
                'order_shops.id',
                'order_shops.order_id',
                'order_status.stat_description',
            ])
            ->orderBy('order_shops.id')
            ->chunkById(250, function ($legs) use ($now) {
                $rows = [];
                foreach ($legs as $leg) {
                    $rows[] = [
                        'order_id' => $leg->order_id,
                        'order_shop_id' => $leg->id,
                        'event' => 'history_baseline',
                        'from_status' => null,
                        'to_status' => $leg->stat_description,
                        'user_id' => null,
                        'notes' => 'Current status imported when per-shop history was enabled.',
                        'metadata' => json_encode([
                            'backfilled' => true,
                            'source' => 'migration',
                        ]),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if ($rows !== []) {
                    DB::table('order_logs')->insert($rows);
                }
            }, 'order_shops.id', 'id');
    }

    public function down(): void
    {
        Schema::table('proof_of_delivery', function (Blueprint $table) {
            $table->dropForeign(['order_shop_id']);
            $table->dropUnique(['order_shop_id']);
            $table->dropIndex(['order_shop_id', 'created_at']);
            $table->dropColumn('order_shop_id');
        });

        Schema::table('order_logs', function (Blueprint $table) {
            $table->dropForeign(['order_shop_id']);
            $table->dropIndex(['order_shop_id', 'created_at']);
            $table->dropColumn('order_shop_id');
        });
    }
};
