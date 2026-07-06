<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            if (!Schema::hasColumn('shops', 'bank_name')) {
                $table->string('bank_name', 150)->nullable()->after('operating_hours');
            }
            if (!Schema::hasColumn('shops', 'account_name')) {
                $table->string('account_name', 150)->nullable()->after('bank_name');
            }
            if (!Schema::hasColumn('shops', 'account_number')) {
                $table->string('account_number', 50)->nullable()->after('account_name');
            }
        });

        Schema::table('shops', function (Blueprint $table) {
            if (Schema::hasColumn('shops', 'bank_details')) {
                $table->dropColumn('bank_details');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            if (!Schema::hasColumn('shops', 'bank_details')) {
                $table->text('bank_details')->nullable()->after('operating_hours');
            }
        });

        Schema::table('shops', function (Blueprint $table) {
            if (Schema::hasColumn('shops', 'bank_name')) {
                $table->dropColumn('bank_name');
            }
            if (Schema::hasColumn('shops', 'account_name')) {
                $table->dropColumn('account_name');
            }
            if (Schema::hasColumn('shops', 'account_number')) {
                $table->dropColumn('account_number');
            }
        });
    }
};
