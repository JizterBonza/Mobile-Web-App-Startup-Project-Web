<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_releases', function (Blueprint $table) {
            $table->id();

            // Which app / platform (lets you add rider app, vendor app, iOS later)
            $table->string('app_key', 50)->default('klasmeyt-mobile')->index();
            $table->string('platform', 20)->default('android');

            // Versioning
            $table->string('version_name', 30);              // "2.5.0"
            $table->unsignedInteger('version_code');         // 88 (Android versionCode, must always increase)
            $table->text('release_notes')->nullable();

            // S3 storage: save the KEY, never the full URL
            $table->string('storage_disk', 30)->default('s3');
            $table->string('storage_path');                  // "apks/klasmeyt/2.5.0-88.apk"
            $table->string('original_filename');
            $table->unsignedBigInteger('file_size');         // bytes
            $table->char('checksum_sha256', 64);
            $table->string('mime_type', 100)->default('application/vnd.android.package-archive');

            // Rollout control
            $table->enum('status', ['draft', 'staging', 'live', 'archived'])->default('draft')->index();
            $table->enum('channel', ['staging', 'production'])->default('staging');
            $table->boolean('is_force_update')->default(false);
            $table->unsignedInteger('min_supported_version_code')->nullable();
            $table->unsignedTinyInteger('rollout_percentage')->default(100);

            // Audit
            $table->foreignId('uploaded_by')->constrained('users');
            $table->timestamp('published_at')->nullable();
            $table->unsignedInteger('download_count')->default(0);  // cached counter
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['app_key', 'platform', 'version_code']);
            $table->index(['app_key', 'channel', 'status']);
        });

        // Optional: one row per download, for the monitoring charts
        Schema::create('app_release_downloads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('app_release_id')->constrained('app_releases')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->string('device_info')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['app_release_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_release_downloads');
        Schema::dropIfExists('app_releases');
    }
};
