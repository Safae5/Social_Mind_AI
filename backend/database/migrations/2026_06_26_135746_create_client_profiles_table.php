<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Un Business User peut avoir plusieurs clients
        // Chaque client est un profil géré par le Business
        Schema::create('client_profiles', function (Blueprint $table) {
            $table->id();

            // Le Business User qui gère ce client
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('cascade');

            // ── Infos client ──────────────────────────────────────
            $table->string('company_name');
            $table->string('contact_name')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('website')->nullable();
            $table->string('logo')->nullable();

            // ── Contexte marketing ────────────────────────────────
            // Données extraites par l'Agent Chef de Compte
            $table->string('niche')->nullable();
            $table->text('target_audience')->nullable();
            $table->json('goals')->nullable();
            $table->json('competitors')->nullable();
            $table->json('platforms')->nullable();  // ['instagram', 'tiktok']
            $table->string('brand_tone')->nullable(); // 'professional', 'casual'

            // ── Stratégie active ──────────────────────────────────
            $table->text('current_strategy')->nullable();
            $table->date('strategy_start_date')->nullable();
            $table->date('strategy_end_date')->nullable();

            // ── Facturation client ────────────────────────────────
            $table->decimal('monthly_retainer', 10, 2)->nullable();
            $table->string('stripe_connect_customer_id')->nullable();

            // ── Statut ────────────────────────────────────────────
            $table->enum('status', ['active', 'paused', 'archived'])->default('active');

            // ── Transcription réunion (Agent Chef de Compte) ──────
            $table->text('last_meeting_transcript')->nullable();
            $table->timestamp('last_meeting_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_profiles');
    }
};