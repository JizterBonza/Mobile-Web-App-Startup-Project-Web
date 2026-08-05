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
        Schema::create('shop_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shop_id')->constrained('shops')->cascadeOnDelete();
            $table->foreignId('customer_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('last_message_at')->nullable();
            $table->string('last_message_preview', 500)->nullable();
            $table->timestamps();

            $table->unique(['shop_id', 'customer_user_id'], 'shop_conv_shop_customer_unique');
            $table->index(['shop_id', 'last_message_at'], 'shop_conv_shop_last_msg_idx');
        });

        Schema::create('shop_conversation_messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shop_conversation_id');
            $table->foreignId('sender_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('sender_role', 32);
            $table->string('type', 16)->default('text');
            $table->text('body')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('shop_conversation_id', 'scm_conversation_fk')
                ->references('id')
                ->on('shop_conversations')
                ->cascadeOnDelete();
            $table->index(['shop_conversation_id', 'created_at'], 'scm_conv_created_idx');
        });

        Schema::create('shop_conversation_attachments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shop_conversation_message_id');
            $table->string('file_name');
            $table->string('file_path');
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('mime_type', 128)->nullable();
            $table->timestamps();

            $table->foreign('shop_conversation_message_id', 'sca_message_fk')
                ->references('id')
                ->on('shop_conversation_messages')
                ->cascadeOnDelete();
        });

        Schema::create('shop_conversation_reads', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shop_conversation_id');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('last_read_at');
            $table->timestamps();

            $table->foreign('shop_conversation_id', 'scr_conversation_fk')
                ->references('id')
                ->on('shop_conversations')
                ->cascadeOnDelete();
            $table->unique(['shop_conversation_id', 'user_id'], 'scr_conv_user_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shop_conversation_reads');
        Schema::dropIfExists('shop_conversation_attachments');
        Schema::dropIfExists('shop_conversation_messages');
        Schema::dropIfExists('shop_conversations');
    }
};
