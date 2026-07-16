<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discount_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->decimal('original_price', 10, 2);
            $table->decimal('actual_discount', 10, 2);
            $table->decimal('discounted_price', 10, 2);
            $table->decimal('discount_percent', 5, 2)->nullable();
            $table->string('discount_type', 20)->nullable();
            $table->dateTime('discount_expires_at')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            $table->index(['item_id', 'is_active'], 'idx_discount_logs_item_id_is_active');
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::unprepared('
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
            ');
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::unprepared('DROP TRIGGER IF EXISTS trg_items_discount_log_update');
        }

        Schema::dropIfExists('discount_logs');
    }
};
