<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('klasrum_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->timestamps();
        });

        $now = now();
        foreach (['Health', 'Nutrition', 'Training', 'News', 'General'] as $name) {
            DB::table('klasrum_categories')->insert([
                'name' => $name,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        Schema::table('klasrum_contents', function (Blueprint $table) {
            $table->foreignId('category_id')
                ->nullable()
                ->after('body')
                ->constrained('klasrum_categories')
                ->nullOnDelete();
        });

        $categoryIds = DB::table('klasrum_categories')->pluck('id', 'name');

        DB::table('klasrum_contents')
            ->whereNotNull('category')
            ->orderBy('id')
            ->get(['id', 'category'])
            ->each(function ($row) use ($categoryIds) {
                $categoryId = $categoryIds[$row->category] ?? null;
                if ($categoryId) {
                    DB::table('klasrum_contents')->where('id', $row->id)->update([
                        'category_id' => $categoryId,
                    ]);
                }
            });

        Schema::table('klasrum_contents', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }

    public function down(): void
    {
        Schema::table('klasrum_contents', function (Blueprint $table) {
            $table->string('category', 100)->nullable()->after('body');
        });

        $categoryNames = DB::table('klasrum_categories')->pluck('name', 'id');

        DB::table('klasrum_contents')
            ->whereNotNull('category_id')
            ->orderBy('id')
            ->get(['id', 'category_id'])
            ->each(function ($row) use ($categoryNames) {
                DB::table('klasrum_contents')->where('id', $row->id)->update([
                    'category' => $categoryNames[$row->category_id] ?? null,
                ]);
            });

        Schema::table('klasrum_contents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('category_id');
        });

        Schema::dropIfExists('klasrum_categories');
    }
};
