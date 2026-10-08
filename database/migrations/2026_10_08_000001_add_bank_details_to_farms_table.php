<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('farms')) {
            return;
        }

        Schema::table('farms', function (Blueprint $table) {
            if (! Schema::hasColumn('farms', 'bank_name')) {
                $table->string('bank_name', 150)->nullable()->after('operating_hours');
            }
            if (! Schema::hasColumn('farms', 'account_name')) {
                $table->string('account_name', 150)->nullable()->after('bank_name');
            }
            if (! Schema::hasColumn('farms', 'account_number')) {
                $table->string('account_number', 50)->nullable()->after('account_name');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('farms')) {
            return;
        }

        Schema::table('farms', function (Blueprint $table) {
            foreach (['account_number', 'account_name', 'bank_name'] as $column) {
                if (Schema::hasColumn('farms', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
