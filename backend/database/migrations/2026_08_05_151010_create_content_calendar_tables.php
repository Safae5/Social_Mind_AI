<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Table principale : un plan par semaine ─────────────
        Schema::create('content_calendars', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('social_account_id')
                  ->constrained('social_accounts')
                  ->onDelete('cascade');

            $table->date('week_start');       // Lundi de la semaine
            $table->date('week_end');         // Dimanche de la semaine
            $table->integer('week_number');   // Numéro de semaine ISO
            $table->integer('year');

            // ── Paramètres de génération ───────────────────────
            $table->string('niche');
            $table->json('platforms');
            $table->integer('frequency')->default(5);
            $table->json('objectives')->nullable();

            // ── Score cohérence MiniLM ─────────────────────────
            $table->float('coherence_score')->nullable();
            $table->string('coherence_level')->nullable();

            $table->enum('status', ['draft', 'active', 'archived'])->default('draft');
            $table->boolean('is_read')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'week_number', 'year']);
            $table->index(['user_id', 'week_start']);
        });

        // ── Table des slots : un enregistrement par jour ────────
        Schema::create('calendar_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('content_calendar_id')
                  ->constrained('content_calendars')
                  ->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // ── Informations du jour ───────────────────────────
            $table->string('day_name');
            $table->date('date');
            $table->integer('day_index');
            $table->boolean('is_rest_day')->default(false);

            // ── Contenu suggéré par Mistral 7B ─────────────────
            $table->string('platform')->nullable();
            $table->string('post_type')->nullable();
            $table->string('subject')->nullable();
            $table->text('angle')->nullable();
            $table->text('caption_idea')->nullable();
            $table->string('best_time')->nullable();
            $table->json('hashtag_themes')->nullable();
            $table->json('hashtags')->nullable();
            $table->text('why')->nullable();
            $table->float('coherence_score')->nullable();

            // ── Workflow utilisateur ───────────────────────────
            $table->enum('status', [
                'suggested',
                'approved',
                'modified',
                'queued',
                'published',
                'skipped',
            ])->default('suggested');

            // ── Modifications utilisateur ──────────────────────
            $table->string('user_platform')->nullable();
            $table->string('user_post_type')->nullable();
            $table->string('user_subject')->nullable();
            $table->text('user_caption')->nullable();
            $table->string('user_time')->nullable();

            // ── Lien Planificateur ────────────────────────────
            $table->unsignedBigInteger('content_queue_id')->nullable();

            $table->timestamps();
            $table->index(['user_id', 'date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_slots');
        Schema::dropIfExists('content_calendars');
    }
};