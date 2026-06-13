<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('user_details', 'otp_hash')) {
            return;
        }

        Schema::table('user_details', function (Blueprint $table) {
            $table->dropColumn(['otp_hash', 'otp_expires_at']);
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('user_details', 'otp_hash')) {
            return;
        }

        Schema::table('user_details', function (Blueprint $table) {
            $table->string('otp_hash', 255)->nullable()->after('mobile_number');
            $table->timestamp('otp_expires_at')->nullable()->after('otp_hash');
        });
    }
};
