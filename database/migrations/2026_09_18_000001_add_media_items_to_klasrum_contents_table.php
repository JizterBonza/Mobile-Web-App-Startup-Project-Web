<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('klasrum_contents', function (Blueprint $table) {
            $table->json('media_items')->nullable()->after('media_type');
        });

        $rows = DB::table('klasrum_contents')
            ->whereNotNull('media_path')
            ->where('media_path', '!=', '')
            ->get(['id', 'media_path', 'media_type']);

        foreach ($rows as $row) {
            DB::table('klasrum_contents')->where('id', $row->id)->update([
                'media_items' => json_encode([[
                    'path' => $row->media_path,
                    'type' => $row->media_type === 'video' ? 'video' : 'image',
                ]]),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('klasrum_contents', function (Blueprint $table) {
            $table->dropColumn('media_items');
        });
    }
};
