<?php

use Illuminate\Database\Migrations\Migration;

/**
 * Superseded: address/coordinates belong on shops only (`2026_04_24_000000_drop_location_fields_from_agrivets_table`).
 * Left as no-op so environments that already ran this migration stay consistent.
 */
return new class extends Migration
{
    public function up(): void
    {
        //
    }

    public function down(): void
    {
        //
    }
};
