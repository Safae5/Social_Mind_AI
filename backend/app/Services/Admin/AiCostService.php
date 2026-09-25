<?php

namespace App\Services\Admin;

/**
 * Architecture de coût IA, consciente du provider (spec 9.3).
 *
 * État réel vérifié (Phase 6, grep exhaustif sur ai-engine/routers) :
 *   - AUCUN appel OpenAI ou Anthropic nulle part dans le code.
 *   - HuggingFace Inference API (HF_TOKEN) utilisée dans 27 fichiers —
 *     essentiellement Mistral-7B-Instruct — sur le plan gratuit HF.
 *   - Whisper, BERTopic, XGBoost, Prophet, SDXL-Turbo, etc. tournent en
 *     inférence LOCALE (poids téléchargés, calcul CPU/GPU local) — coût
 *     infrastructure, pas coût par appel API.
 *
 * Conséquence : $0.00 partout aujourd'hui n'est PAS une donnée fictive,
 * c'est le coût réel (HF gratuit + inférence locale). Cette classe expose
 * la structure prête à calculer un vrai coût le jour où un provider payant
 * (OpenAI, Anthropic, HF Inference Endpoints payants...) est configuré —
 * sans qu'il faille retoucher l'agrégation (AggregateAgentUsageStatsJob
 * lit déjà agent_usage_stats.api_cost_usd).
 */
class AiCostService
{
    /**
     * Tarifs connus par provider — vide tant qu'aucun provider payant
     * n'est configuré. Ajouter une entrée ici (et le calcul associé côté
     * ai-engine) est le seul changement nécessaire pour activer un vrai
     * suivi de coût.
     */
    private const KNOWN_RATES = [
        // 'openai' => ['gpt-4o-mini' => ['input_per_1k' => 0.00015, 'output_per_1k' => 0.0006]],
        // 'anthropic' => [...],
    ];

    public function providersInUse(): array
    {
        return [
            'huggingface_free' => [
                'label'      => 'HuggingFace Inference API (gratuit)',
                'agents'     => 'La quasi-totalité (Mistral-7B-Instruct pour la génération de texte)',
                'billable'   => false,
                'note'       => 'Aucun coût par appel — quota du plan HF gratuit, pas facturé à l\'usage.',
            ],
            'local_inference' => [
                'label'      => 'Inférence locale (poids téléchargés)',
                'agents'     => 'Whisper, BERTopic, XGBoost, Prophet, SDXL-Turbo, spaCy, VADER, etc.',
                'billable'   => false,
                'note'       => 'Coût infrastructure (CPU/GPU local), pas de coût par appel API.',
            ],
        ];
    }

    public function hasAnyPaidProviderConfigured(): bool
    {
        return count(self::KNOWN_RATES) > 0;
    }
}
