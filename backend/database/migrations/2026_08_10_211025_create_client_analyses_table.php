<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // ── Fichier original (MP4, MP3, WAV, M4A, MOV — max 200 Mo) ──
            $table->string('fichier_original_nom');
            $table->string('fichier_original_path');
            $table->string('fichier_type');             // mp4, mp3, wav...
            $table->decimal('fichier_taille_mb', 8, 2);

            // ── Informations client ────────────────────────────────────────
            $table->string('client_nom');
            $table->string('client_langue')->default('fr'); // fr, en, ar

            // ── Résultats IA ───────────────────────────────────────────────
            $table->longText('transcription_text')->nullable();   // Whisper
            $table->integer('transcription_mots')->nullable();
            $table->decimal('transcription_duree', 8, 1)->nullable(); // secondes
            $table->json('profil_client')->nullable();  // Mistral 7B extraction TAL
            $table->json('entites_ner')->nullable();    // spaCy fr_core_news_md
            $table->json('strategie')->nullable();      // Mistral 7B plan 30 jours

            // ── PDF ReportLab ──────────────────────────────────────────────
            $table->string('pdf_path')->nullable();

            // ── Statut du pipeline ─────────────────────────────────────────
            $table->enum('statut', [
                'en_attente',    // Fichier uploadé, job pas encore lancé
                'transcription', // Whisper en cours
                'extraction',    // Mistral 7B extraction profil
                'strategie',     // Mistral 7B génération stratégie
                'pdf',           // ReportLab génération PDF
                'termine',       // Pipeline complet ✅
                'erreur',        // Erreur ❌
            ])->default('en_attente');

            $table->text('erreur_message')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'statut']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_analyses');
    }
};