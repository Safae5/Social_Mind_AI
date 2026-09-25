<?php

// ══════════════════════════════════════════════════════════════
// Registre des 13 agents IA réels — source unique de vérité.
//
// Vérifié directement contre ai-engine/main.py et chaque router.py
// (Phase 6, 2026-08-30) — ne pas supposer un nombre ou des noms
// d'agents sans re-vérifier ai-engine/routers/*/router.py.
//
//   'slug'        : identifiant utilisé côté Laravel (agent_statuses,
//                   agent_logs, agent_usage_stats, admin API, UI).
//                   Correspond à AgentActivityLog.agent_slug pour les
//                   7 agents Professional déjà en usage réel.
//   'health_path' : segment de préfixe réel du router FastAPI, tel que
//                   déclaré par APIRouter(prefix=...) — utilisé pour
//                   les health checks. Diffère du slug pour deux agents
//                   (content-strategy → /content-strategist,
//                   content-generator → /content — vérifié, pas deviné).
//   'tier'        : 'standard' (6 agents) | 'professional' (7 agents).
// ══════════════════════════════════════════════════════════════

return [
    'agents' => [
        // ── Tier Standard (6) ──────────────────────────────────
        ['slug' => 'scheduler',         'health_path' => 'scheduler',         'name' => 'Planificateur Intelligent',      'tier' => 'standard'],
        ['slug' => 'content-generator', 'health_path' => 'content',           'name' => 'Générateur de Contenu',          'tier' => 'standard'],
        ['slug' => 'hashtags',          'health_path' => 'hashtags',          'name' => 'Suggesteur de Hashtags',         'tier' => 'standard'],
        ['slug' => 'auto-reply',        'health_path' => 'auto-reply',        'name' => 'Répondeur Automatique',          'tier' => 'standard'],
        ['slug' => 'weekly-report',     'health_path' => 'weekly-report',     'name' => 'Rapport Hebdomadaire',           'tier' => 'standard'],
        ['slug' => 'content-calendar',  'health_path' => 'content-calendar',  'name' => 'Calendrier de Contenu',          'tier' => 'standard'],

        // ── Tier Professional (7) ───────────────────────────────
        ['slug' => 'account-manager',   'health_path' => 'account-manager',   'name' => 'Agent Chef de Compte',           'tier' => 'professional'],
        ['slug' => 'social-manager',    'health_path' => 'social-manager',    'name' => 'Agent Gestionnaire de RS',       'tier' => 'professional'],
        ['slug' => 'content-strategy',  'health_path' => 'content-strategist','name' => 'Agent Stratège de Contenu',      'tier' => 'professional'],
        ['slug' => 'content-creator',   'health_path' => 'content-creator',   'name' => 'Agent Créateur de Contenu IA',   'tier' => 'professional'],
        ['slug' => 'analytics',         'health_path' => 'analytics',         'name' => 'Agent Analytics IA',             'tier' => 'professional'],
        ['slug' => 'ad-optimizer',      'health_path' => 'ad-optimizer',      'name' => 'Agent Optimisation Publicitaire','tier' => 'professional'],
        ['slug' => 'competitive-intel', 'health_path' => 'competitive-intel', 'name' => 'Agent Veille Concurrentielle',   'tier' => 'professional'],
    ],
];
