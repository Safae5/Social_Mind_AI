<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weekly_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('social_account_id')
                  ->constrained('social_accounts')
                  ->onDelete('cascade');

            // ── Période du rapport ─────────────────────────────
            $table->date('week_start');
            $table->date('week_end');
            $table->integer('week_number');    // Numéro de semaine ISO
            $table->integer('year');

            // ── Métriques de la semaine ────────────────────────
            $table->integer('total_reach')->default(0);
            $table->integer('total_engagement')->default(0);
            $table->integer('total_likes')->default(0);
            $table->integer('total_comments')->default(0);
            $table->integer('total_shares')->default(0);
            $table->integer('total_saves')->default(0);
            $table->integer('total_posts')->default(0);
            $table->integer('followers_gained')->default(0);
            $table->integer('followers_lost')->default(0);
            $table->integer('followers_now')->default(0);

            // ── Meilleure publication ──────────────────────────
            $table->string('best_post_id')->nullable();
            $table->text('best_post_caption')->nullable();
            $table->integer('best_post_reach')->default(0);
            $table->integer('best_post_likes')->default(0);

            // ── Résumé IA — Mistral 7B ─────────────────────────
            $table->text('ai_bilan')->nullable();
            $table->text('ai_top_publication')->nullable();
            $table->text('ai_audience')->nullable();
            $table->text('ai_recommandation')->nullable();
            $table->string('ai_emoji_semaine')->nullable();
            $table->string('ai_titre_semaine')->nullable();
            $table->integer('score')->default(0);

            // ── Données graphique Chart.js ─────────────────────
            $table->json('trend_data')->nullable();

            // ── Livraison ─────────────────────────────────────
            $table->boolean('email_sent')->default(false);
            $table->timestamp('email_sent_at')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();

            $table->timestamps();

            $table->unique(['user_id', 'social_account_id', 'week_number', 'year']);
            $table->index(['user_id', 'week_start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_reports');
    }
};