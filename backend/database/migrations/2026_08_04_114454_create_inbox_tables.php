<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Table principale : commentaires + DMs ──────────────
        Schema::create('inbox_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('social_account_id')
                  ->constrained('social_accounts')
                  ->onDelete('cascade');

            // ── Données du message ────────────────────────────
            $table->enum('message_type', ['comment', 'dm']);
            $table->string('platform_message_id')->unique();
            $table->string('platform');
            $table->text('text');
            $table->string('author_id')->nullable();
            $table->string('author_name')->nullable();
            $table->string('post_id')->nullable();
            $table->text('post_caption')->nullable();

            // ── Classification IA ─────────────────────────────
            $table->enum('sentiment', [
                'positive', 'question', 'negative', 'neutral', 'spam'
            ])->nullable();
            $table->float('sentiment_confidence')->nullable();
            $table->float('toxicity_score')->nullable();

            // ── Réponse IA ────────────────────────────────────
            $table->text('ai_reply')->nullable();
            $table->text('final_reply')->nullable();
            $table->float('brand_voice_score')->nullable();

            // ── Statut workflow ───────────────────────────────
            $table->enum('status', [
                'new',
                'classified',
                'reply_generated',
                'pending_approval',
                'approved',
                'published',
                'rejected',
                'flagged',
                'hidden',
                'auto_replied',
            ])->default('new');

            $table->boolean('is_read')->default(false);
            $table->timestamp('platform_created_at')->nullable();
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status', 'message_type']);
            $table->index(['user_id', 'platform', 'created_at']);
        });

        // ── Configuration auto-réponse par compte ──────────────
        Schema::create('auto_reply_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('social_account_id')
                  ->constrained('social_accounts')
                  ->onDelete('cascade');

            // ── Règles ────────────────────────────────────────
            $table->boolean('auto_reply_positive')->default(false);
            $table->boolean('auto_reply_questions')->default(false);
            $table->boolean('auto_hide_spam')->default(true);
            $table->boolean('auto_flag_negative')->default(true);

            // ── Voix de marque ────────────────────────────────
            $table->json('brand_examples')->nullable();
            $table->string('brand_name')->nullable();

            // ── Notifications ─────────────────────────────────
            $table->boolean('notify_negative')->default(true);
            $table->boolean('notify_new_dm')->default(true);

            $table->timestamps();
            $table->unique(['user_id', 'social_account_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auto_reply_configs');
        Schema::dropIfExists('inbox_messages');
    }
};