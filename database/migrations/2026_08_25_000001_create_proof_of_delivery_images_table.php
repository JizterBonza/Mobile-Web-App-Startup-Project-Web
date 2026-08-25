<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proof_of_delivery_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proof_of_delivery_id')
                ->constrained('proof_of_delivery')
                ->cascadeOnDelete();
            $table->string('image_path', 2048);
            $table->unsignedTinyInteger('sort_order');
            $table->timestamps();

            $table->unique(['proof_of_delivery_id', 'sort_order'], 'pod_images_proof_sort_unique');
        });

        DB::table('proof_of_delivery')
            ->whereNotNull('image_path')
            ->where('image_path', '!=', '')
            ->orderBy('id')
            ->chunkById(250, function ($proofs) {
                $now = now();
                $rows = [];

                foreach ($proofs as $proof) {
                    $rows[] = [
                        'proof_of_delivery_id' => $proof->id,
                        'image_path' => $proof->image_path,
                        'sort_order' => 0,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if ($rows !== []) {
                    DB::table('proof_of_delivery_images')->insert($rows);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('proof_of_delivery_images');
    }
};
