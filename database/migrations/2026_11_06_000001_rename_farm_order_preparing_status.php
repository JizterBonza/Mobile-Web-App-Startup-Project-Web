<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('farm_orders')->where('status', 'awaiting_schedule')->update(['status' => 'preparing']);
    }

    public function down(): void
    {
        DB::table('farm_orders')->where('status', 'preparing')->update(['status' => 'awaiting_schedule']);
    }
};
