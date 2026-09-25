<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientAnalysis extends Model
{
    protected $fillable = [
        'user_id',
        'fichier_original_nom', 'fichier_original_path',
        'fichier_type', 'fichier_taille_mb',
        'client_nom', 'client_langue',
        'transcription_text', 'transcription_mots', 'transcription_duree',
        'profil_client', 'entites_ner', 'strategie',
        'pdf_path', 'statut', 'erreur_message', 'is_read',
    ];

    protected $casts = [
        'profil_client' => 'array',
        'entites_ner'   => 'array',
        'strategie'     => 'array',
        'is_read'       => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Résumé du profil pour les réponses API.
     */
    public function getProfilSummary(): array
    {
        $p = $this->profil_client ?? [];
        return [
            'niche'       => $p['niche']          ?? 'N/A',
            'business'    => $p['business_name']  ?? $this->client_nom,
            'plateformes' => $p['plateformes']    ?? [],
            'objectifs'   => $p['objectifs']      ?? [],
            'budget'      => $p['budget_mensuel'] ?? null,
            'ton'         => $p['ton_communication'] ?? null,
            'audience'    => $p['audience_cible'] ?? [],
            'concurrents' => $p['concurrents']    ?? [],
        ];
    }

    public function isTermine(): bool
    {
        return $this->statut === 'termine';
    }

    public function hasPdf(): bool
    {
        return !empty($this->pdf_path);
    }

    /**
     * Labels lisibles des étapes du pipeline.
     */
    public static function getStatutLabel(string $statut): string
    {
        return match($statut) {
            'en_attente'    => '⏳ En attente',
            'transcription' => '🎙️ Whisper — Transcription',
            'extraction'    => '🤖 Mistral 7B — Extraction profil',
            'strategie'     => '📅 Mistral 7B — Stratégie 30 jours',
            'pdf'           => '📄 ReportLab — Génération PDF',
            'termine'       => '✅ Pipeline terminé',
            'erreur'        => '❌ Erreur',
            default         => $statut,
        };
    }

    public static function getStatutProgress(string $statut): int
    {
        return match($statut) {
            'en_attente'    => 0,
            'transcription' => 20,
            'extraction'    => 50,
            'strategie'     => 75,
            'pdf'           => 90,
            'termine'       => 100,
            'erreur'        => 0,
            default         => 0,
        };
    }
}