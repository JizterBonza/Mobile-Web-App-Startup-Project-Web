<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->timestamp('read_at')->nullable()->after('status');
        });

        DB::table('contact_messages')
            ->where('status', 'read')
            ->whereNull('read_at')
            ->update(['read_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->dropColumn('read_at');
        });
    }
};
