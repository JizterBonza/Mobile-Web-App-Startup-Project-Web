<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::unprepared('DROP TRIGGER IF EXISTS trg_items_discount_log_update');

        // Manual discounts intentionally never expire.
        DB::table('items')
            ->where('discount_type', 'manual')
            ->whereNotNull('discount_expires_at')
            ->update(['discount_expires_at' => null]);

        // Rebuild the active-log state so existing manual discounts work immediately.
        DB::table('discount_logs')
            ->where('is_active', true)
            ->update(['is_active' => false, 'updated_at' => now()]);

        DB::statement(<<<'SQL'
            INSERT INTO discount_logs (
                item_id,
                original_price,
                actual_discount,
                discounted_price,
                discount_percent,
                discount_type,
                discount_expires_at,
                is_active,
                created_at,
                updated_at
            )
            SELECT
                items.id,
                items.item_price,
                ROUND(items.item_price * items.discount_percent / 100, 2),
                ROUND(items.item_price * (1 - items.discount_percent / 100), 2),
                items.discount_percent,
                items.discount_type,
                items.discount_expires_at,
                1,
                NOW(),
                NOW()
            FROM items
            WHERE items.discount_percent > 0
              AND (
                  items.discount_type = 'manual'
                  OR (
                      items.discount_type = 'timed'
                      AND items.discount_expires_at IS NOT NULL
                      AND items.discount_expires_at >= NOW()
                  )
              )
        SQL);

        $this->createCorrectedTrigger();
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::unprepared('DROP TRIGGER IF EXISTS trg_items_discount_log_update');
        $this->createOriginalTrigger();
    }

    private function createCorrectedTrigger(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_items_discount_log_update
            AFTER UPDATE ON items
            FOR EACH ROW
            BEGIN
                DECLARE v_is_active TINYINT(1);
                DECLARE v_discounted_price DECIMAL(10, 2);
                DECLARE v_actual_discount DECIMAL(10, 2);

                IF NOT (OLD.item_price <=> NEW.item_price)
                    OR NOT (OLD.discount_percent <=> NEW.discount_percent)
                    OR NOT (OLD.discount_type <=> NEW.discount_type)
                    OR NOT (OLD.discount_expires_at <=> NEW.discount_expires_at) THEN

                    UPDATE discount_logs
                    SET is_active = 0,
                        updated_at = NOW()
                    WHERE item_id = NEW.id
                      AND is_active = 1;

                    SET v_is_active = IF(
                        NEW.discount_percent IS NOT NULL
                        AND NEW.discount_percent > 0
                        AND (
                            NEW.discount_type = 'manual'
                            OR (
                                NEW.discount_type = 'timed'
                                AND NEW.discount_expires_at IS NOT NULL
                                AND NEW.discount_expires_at >= NOW()
                            )
                        ),
                        1,
                        0
                    );

                    SET v_discounted_price = IF(
                        v_is_active = 1,
                        ROUND(NEW.item_price * (1 - NEW.discount_percent / 100), 2),
                        NEW.item_price
                    );

                    SET v_actual_discount = ROUND(NEW.item_price - v_discounted_price, 2);

                    INSERT INTO discount_logs (
                        item_id,
                        original_price,
                        actual_discount,
                        discounted_price,
                        discount_percent,
                        discount_type,
                        discount_expires_at,
                        is_active,
                        created_at,
                        updated_at
                    ) VALUES (
                        NEW.id,
                        NEW.item_price,
                        v_actual_discount,
                        v_discounted_price,
                        NEW.discount_percent,
                        NEW.discount_type,
                        NEW.discount_expires_at,
                        v_is_active,
                        NOW(),
                        NOW()
                    );
                END IF;
            END
        SQL);
    }

    private function createOriginalTrigger(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_items_discount_log_update
            AFTER UPDATE ON items
            FOR EACH ROW
            BEGIN
                DECLARE v_is_active TINYINT(1);
                DECLARE v_discounted_price DECIMAL(10, 2);
                DECLARE v_actual_discount DECIMAL(10, 2);

                IF NOT (OLD.discount_expires_at <=> NEW.discount_expires_at) THEN
                    UPDATE discount_logs
                    SET is_active = 0
                    WHERE item_id = NEW.id
                      AND is_active = 1;

                    SET v_is_active = IF(NEW.discount_expires_at > NOW(), 1, 0);

                    SET v_discounted_price = IF(
                        v_is_active = 1 AND NEW.discount_percent IS NOT NULL AND NEW.discount_percent > 0,
                        ROUND(NEW.item_price * (1 - NEW.discount_percent / 100), 2),
                        NEW.item_price
                    );

                    SET v_actual_discount = ROUND(NEW.item_price - v_discounted_price, 2);

                    INSERT INTO discount_logs (
                        item_id,
                        original_price,
                        actual_discount,
                        discounted_price,
                        discount_percent,
                        discount_type,
                        discount_expires_at,
                        is_active,
                        created_at,
                        updated_at
                    ) VALUES (
                        NEW.id,
                        NEW.item_price,
                        v_actual_discount,
                        v_discounted_price,
                        NEW.discount_percent,
                        NEW.discount_type,
                        NEW.discount_expires_at,
                        v_is_active,
                        NOW(),
                        NOW()
                    );
                END IF;
            END
        SQL);
    }
};
