<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->decimal('discount_percent', 5, 2)->nullable()->after('item_price');
            $table->string('discount_type', 20)->nullable()->after('discount_percent');
            $table->dateTime('discount_expires_at')->nullable()->after('discount_type');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn(['discount_percent', 'discount_type', 'discount_expires_at']);
        });
    }
};
