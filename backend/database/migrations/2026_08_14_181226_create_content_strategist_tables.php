<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Stratégies de contenu générées ────────────────────
        // Préfixe cs_ = Content Strategist (évite conflit avec content_packs Agent 4)
        Schema::create('cs_strategies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')
                  ->nullable()
                  ->constrained('clients')
                  ->nullOnDelete();

            $table->string('client_name');
            $table->string('niche');
            $table->string('secteur')->nullable();
            $table->text('audience');
            $table->text('objectifs')->nullable();
            $table->json('plateformes');
            $table->string('ton')->default('professionnel et accessible');

            // Résultats Mistral 7B
            $table->text('strategie_editoriale')->nullable();
            $table->text('tone_of_voice')->nullable();
            $table->json('frequence_publication')->nullable();
            $table->json('recommandations_cles')->nullable();

            // Métadonnées
            $table->integer('corpus_size')->default(0);
            $table->json('data_sources')->nullable(); // meta_api, playwright, simulated
            $table->string('pdf_path')->nullable();

            // Statut pipeline
            $table->enum('status', ['pending', 'processing', 'completed', 'failed'])
                  ->default('pending');
            $table->text('error_message')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'client_id', 'status']);
            $table->index(['user_id', 'created_at']);
        });

        // ── Piliers de contenu (BERTopic + LDA) ───────────────
        Schema::create('cs_pillars', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cs_strategy_id')
                  ->constrained('cs_strategies')
                  ->onDelete('cascade');

            $table->integer('pillar_number');      // 1 à 5
            $table->string('nom');
            $table->json('mots_cles');
            $table->text('description')->nullable();
            $table->string('source_ia')->default('BERTopic'); // BERTopic, LDA, Générique
            $table->json('hashtags')->nullable();

            $table->timestamps();
            $table->index(['cs_strategy_id', 'pillar_number']);
        });

        // ── Calendrier hebdomadaire de contenu ─────────────────
        Schema::create('cs_calendars', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cs_strategy_id')
                  ->constrained('cs_strategies')
                  ->onDelete('cascade');

            $table->string('jour');              // Lundi, Mardi...
            $table->string('pilier');
            $table->string('plateforme');
            $table->string('type_contenu');      // Reel, Carrousel, Story...
            $table->text('sujet');
            $table->text('angle')->nullable();
            $table->json('hashtags')->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable();

            $table->timestamps();
            $table->index(['cs_strategy_id', 'jour']);
        });

        // ── Hashtags recommandés TF-IDF (top scorés) ──────────
        Schema::create('cs_hashtag_recs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cs_strategy_id')
                  ->constrained('cs_strategies')
                  ->onDelete('cascade');

            $table->string('hashtag');
            $table->float('tfidf_score')->default(0);
            $table->string('pilier')->nullable();

            $table->timestamps();
            $table->index(['cs_strategy_id', 'tfidf_score']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cs_hashtag_recs');
        Schema::dropIfExists('cs_calendars');
        Schema::dropIfExists('cs_pillars');
        Schema::dropIfExists('cs_strategies');
    }
};