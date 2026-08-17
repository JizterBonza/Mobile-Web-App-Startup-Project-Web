<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('klasrum_contents', function (Blueprint $table) {
            $table->id();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->string('heading')->nullable();
            $table->longText('body')->nullable();
            $table->string('category', 100)->nullable();
            $table->string('caption')->nullable();
            $table->string('cover_path')->nullable();
            $table->string('media_path')->nullable();
            $table->string('media_type', 20)->nullable();
            $table->string('status', 20)->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
        });

        $adminId = DB::table('users')->where('user_type', 'super_admin')->value('id');

        if ($adminId) {
            DB::table('klasrum_contents')->insert([
                'title' => 'Recognizing Newcastle Disease Before it Spreads',
                'description' => 'Newcastle disease can wipe out a flock in days. Learn the early warning signs now.',
                'heading' => null,
                'body' => null,
                'category' => 'Health',
                'caption' => null,
                'cover_path' => null,
                'media_path' => null,
                'media_type' => null,
                'status' => 'published',
                'published_at' => '2026-08-10 00:00:00',
                'created_by' => $adminId,
                'updated_by' => $adminId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('klasrum_contents');
    }
};
