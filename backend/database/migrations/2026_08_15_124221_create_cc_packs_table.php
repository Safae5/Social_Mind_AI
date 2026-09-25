<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Packs de contenu IA (Agent Créateur de Contenu IA) ─
        // Préfixe cc_ = Content Creator
        // Table unique — évite tout conflit avec cs_strategies, sm_content_queue, etc.
        Schema::create('cc_packs', function (Blueprint $table) {
            $table->id();

            // ── Professionnel + client ─────────────────────────
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')
                  ->nullable()
                  ->constrained('clients')
                  ->nullOnDelete();

            // Infos client snapshot au moment de la génération
            $table->string('client_name');
            $table->string('client_niche')->nullable();
            $table->string('client_audience')->nullable();

            // ── Paramètres de génération ───────────────────────
            $table->string('platform');             // instagram | tiktok | facebook | linkedin | twitter
            $table->text('subject');
            $table->string('tone')->default('professionnel');
            $table->string('language')->default('Français');

            // ── Légende générée (Mistral 7B) ───────────────────
            $table->text('caption')->nullable();
            $table->json('hashtags')->nullable();
            $table->text('cta')->nullable();
            $table->integer('char_count')->nullable();
            $table->string('image_concept')->nullable(); // Prompt pour SDXL-Turbo

            // ── Fichiers générés ───────────────────────────────
            $table->string('image_path')->nullable();    // PNG 1024×1024 stocké
            $table->string('image_url')->nullable();     // URL publique
            $table->json('script_data')->nullable();     // Script vidéo JSON (5 sections)
            $table->string('pdf_path')->nullable();      // PDF ReportLab
            $table->string('pdf_url')->nullable();

            // ── Workflow d'approbation ─────────────────────────
            // pending   : généré, en attente d'approbation
            // approved  : approuvé par le professionnel
            // published : publié sur le réseau social (Meta Graph API)
            // failed    : échec de publication
            // rejected  : rejeté, contenu à refaire
            $table->enum('publish_status', [
                'pending', 'approved', 'published', 'failed', 'rejected'
            ])->default('pending');

            // ── Publication Meta Graph API v21 ─────────────────
            // Référence sm_accounts (comptes du professionnel pour ses clients)
            $table->foreignId('sm_account_id')
                  ->nullable()
                  ->constrained('sm_accounts')
                  ->nullOnDelete();
            $table->string('platform_post_id')->nullable();    // ID du post publié
            $table->string('platform_post_url')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->text('publish_error')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'platform', 'publish_status']);
            $table->index(['user_id', 'client_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cc_packs');
    }
};