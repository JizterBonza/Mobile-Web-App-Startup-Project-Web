<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Address and coordinates belong on shops only, not agrivets.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('agrivets')) {
            return;
        }

        Schema::table('agrivets', function (Blueprint $table) {
            $columns = [];
            foreach (['address', 'city', 'postal_code', 'latitude', 'longitude'] as $col) {
                if (Schema::hasColumn('agrivets', $col)) {
                    $columns[] = $col;
                }
            }
            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('agrivets')) {
            return;
        }

        Schema::table('agrivets', function (Blueprint $table) {
            if (! Schema::hasColumn('agrivets', 'address')) {
                $table->text('address')->nullable();
            }
            if (! Schema::hasColumn('agrivets', 'city')) {
                $table->string('city', 100)->nullable();
            }
            if (! Schema::hasColumn('agrivets', 'postal_code')) {
                $table->string('postal_code', 10)->nullable();
            }
            if (! Schema::hasColumn('agrivets', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable();
            }
            if (! Schema::hasColumn('agrivets', 'longitude')) {
                $table->decimal('longitude', 10, 7)->nullable();
            }
        });
    }
};
