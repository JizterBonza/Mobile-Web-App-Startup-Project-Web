<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const LEGACY_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'];

    public function up(): void
    {
        if (! in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        DB::statement("ALTER TABLE payments MODIFY COLUMN status ENUM('pending','paid','failed','refunded','partially_refunded','awaiting_session','creating','creation_unknown','creation_failed','expired') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        if (! in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        // Retain the expanded enum on application rollback while farm payments exist.
        if (DB::table('payments')->whereNotIn('status', self::LEGACY_STATUSES)->exists()) {
            throw new RuntimeException('Cannot narrow payments.status while non-legacy payment statuses exist. Keep the expanded enum, or resolve those payments before retrying rollback with payment writes stopped.');
        }

        DB::statement("ALTER TABLE payments MODIFY COLUMN status ENUM('pending','paid','failed','refunded','partially_refunded') NOT NULL DEFAULT 'pending'");
    }
};
