<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->boolean('is_bundle')->default(false)->after('bundle_catalog_ids');
        });

        DB::table('items')->where('metric', 'Bundle')->update(['is_bundle' => true]);

        $bundles = DB::table('items')->where('is_bundle', true)->get();

        foreach ($bundles as $bundle) {
            $ids = $bundle->bundle_catalog_ids ? json_decode($bundle->bundle_catalog_ids, true) : [];
            if (! is_array($ids) || empty($ids)) {
                continue;
            }

            $catalogProducts = DB::table('product_catalog')->whereIn('id', $ids)->get();
            if ($catalogProducts->isEmpty()) {
                continue;
            }

            ['weight' => $weight, 'metric' => $metric] = $this->computeBundleWeightAndMetric($catalogProducts);

            DB::table('items')->where('id', $bundle->id)->update([
                'weight' => $weight,
                'metric' => $metric,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('items')->where('is_bundle', true)->update(['metric' => 'Bundle']);

        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('is_bundle');
        });
    }

    /**
     * @param  \Illuminate\Support\Collection<int, object>  $catalogProducts
     * @return array{weight: ?float, metric: ?string}
     */
    private function computeBundleWeightAndMetric($catalogProducts): array
    {
        $withWeight = $catalogProducts->filter(fn ($p) => $p->weight !== null);

        $metric = $catalogProducts->first(fn ($p) => ! empty($p->unit))?->unit;

        if ($withWeight->isEmpty()) {
            return ['weight' => null, 'metric' => $metric];
        }

        $units = $withWeight
            ->pluck('unit')
            ->map(fn ($u) => strtolower(trim($u ?? '')))
            ->unique()
            ->filter()
            ->values();

        if ($units->count() === 1) {
            return [
                'weight' => round($withWeight->sum(fn ($p) => (float) $p->weight), 2),
                'metric' => $withWeight->first()->unit ?? $metric,
            ];
        }

        $totalWeightKg = $withWeight->sum(
            fn ($p) => $this->convertCatalogWeightToKg((float) $p->weight, $p->unit)
        );

        return [
            'weight' => round($totalWeightKg, 2),
            'metric' => 'kg',
        ];
    }

    private function convertCatalogWeightToKg(float $weight, ?string $metric): float
    {
        return match (strtolower(trim($metric ?? 'kg'))) {
            'g' => $weight / 1000,
            'mg' => $weight / 1_000_000,
            'lb', 'lbs' => $weight * 0.453592,
            'oz' => $weight * 0.0283495,
            'ml' => $weight / 1000,
            'l' => $weight,
            'kg' => $weight,
            default => $weight,
        };
    }
};
