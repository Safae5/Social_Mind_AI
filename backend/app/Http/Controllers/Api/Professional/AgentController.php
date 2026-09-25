<?php

namespace App\Http\Controllers\Api\Professional;

use App\Http\Controllers\Controller;
use App\Models\AgentActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AgentController extends Controller
{
    private string $aiEngineUrl;

    public function __construct()
    {
        $this->aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents — Statut des 7 agents
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $clientId = $request->query('client_id');

        $agents = [];
        foreach (AgentActivityLog::$AGENTS as $slug => $info) {
            $lastLog = AgentActivityLog::where('user_id', $user->id)
                ->where('agent_slug', $slug)
                ->when($clientId, fn($q) => $q->where('client_id', $clientId))
                ->latest()
                ->first();

            $runningCount = AgentActivityLog::where('user_id', $user->id)
                ->where('agent_slug', $slug)
                ->where('status', 'running')
                ->count();

            $completedCount = AgentActivityLog::where('user_id', $user->id)
                ->where('agent_slug', $slug)
                ->where('status', 'success')
                ->count();

            $errorCount = AgentActivityLog::where('user_id', $user->id)
                ->where('agent_slug', $slug)
                ->where('status', 'error')
                ->count();

            // Statut du service AI Engine
            $agentStatus = $this->getAgentServiceStatus($slug);

            $agents[] = [
                'slug'            => $slug,
                'name'            => $info['name'],
                'icon'            => $info['icon'],
                'color'           => $info['color'],
                'description'     => $this->getAgentDescription($slug),
                'capabilities'    => $this->getAgentCapabilities($slug),
                'status'          => $agentStatus,
                'running_tasks'   => $runningCount,
                'completed_tasks' => $completedCount,
                'error_count'     => $errorCount,
                'last_activity'   => $lastLog ? [
                    'action'      => $lastLog->action,
                    'description' => $lastLog->description,
                    'status'      => $lastLog->status,
                    'client'      => $lastLog->client?->name,
                    'time'        => $lastLog->created_at->diffForHumans(),
                ] : null,
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => ['agents' => $agents],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/activity — Flux activité
    // ══════════════════════════════════════════════════════════

    public function activity(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $clientId = $request->query('client_id');
        $agentSlug= $request->query('agent');
        $limit    = min((int) $request->query('limit', 30), 100);

        $logs = AgentActivityLog::where('user_id', $user->id)
            ->with('client:id,name,avatar')
            ->when($clientId, fn($q) => $q->where('client_id', $clientId))
            ->when($agentSlug, fn($q) => $q->where('agent_slug', $agentSlug))
            ->latest()
            ->take($limit)
            ->get()
            ->map(fn($log) => [
                'id'          => $log->id,
                'agent'       => $log->getAgentInfo(),
                'agent_slug'  => $log->agent_slug,
                'action'      => $log->action,
                'description' => $log->description,
                'status'      => $log->status,
                'error'       => $log->error_message,
                'client'      => $log->client ? [
                    'id'     => $log->client->id,
                    'name'   => $log->client->name,
                    'avatar' => $log->client->avatar,
                ] : null,
                'metadata'    => $log->metadata,
                'created_at'  => $log->created_at->toIso8601String(),
                'time_ago'    => $log->created_at->diffForHumans(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => ['activity' => $logs],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/log — Enregistrer activité
    // ══════════════════════════════════════════════════════════

    public function logActivity(Request $request): JsonResponse
    {
        $request->validate([
            'agent_slug' => 'required|string',
            'client_id'  => 'nullable|integer',
            'action'     => 'required|string',
            'description'=> 'nullable|string',
            'status'     => 'nullable|in:success,error,running,pending',
            'metadata'   => 'nullable|array',
        ]);

        /** @var \App\Models\User $user */
        $user    = $request->user();
        $agentInfo = AgentActivityLog::$AGENTS[$request->agent_slug] ?? ['name' => $request->agent_slug, 'icon' => '🤖', 'color' => 'gray'];

        $log = AgentActivityLog::create([
            'user_id'    => $user->id,
            'client_id'  => $request->client_id,
            'agent_slug' => $request->agent_slug,
            'agent_name' => $agentInfo['name'],
            'action'     => $request->action,
            'description'=> $request->description,
            'status'     => $request->status ?? 'success',
            'metadata'   => $request->metadata,
            'started_at' => now(),
            'completed_at'=> now(),
        ]);

        return response()->json(['success' => true, 'data' => ['log' => $log]]);
    }

    // ── Statut du service AI Engine ────────────────────────────
    private function getAgentServiceStatus(string $slug): string
    {
        $endpoint = match($slug) {
            'account-manager'   => '/account-manager/health',
            'social-manager'    => '/social-manager/health',
            // Slug Laravel 'content-strategy' vs prefixe FastAPI réel
            // '/content-strategist' (content_strategist/router.py) — le
            // mismatch faisait 404 ce health check et affichait "Error" en
            // continu sur la carte de l'agent, alors que le service tourne.
            'content-strategy'  => '/content-strategist/health',
            'content-creator'   => '/content-creator/health',
            'analytics'         => '/analytics/health',
            'ad-optimizer'      => '/ad-optimizer/health',
            'competitive-intel' => '/competitive-intel/health',
            default             => '/health',
        };

        try {
            $resp = Http::timeout(3)->get($this->aiEngineUrl . $endpoint);
            return $resp->successful() ? 'active' : 'error';
        } catch (\Exception) {
            return 'offline';
        }
    }

    // ── Descriptions des agents (depuis les .md) ──────────────
    private function getAgentDescription(string $slug): string
    {
        return match($slug) {
            'account-manager'   => 'Transcrit les réunions clients et génère automatiquement des stratégies marketing 30 jours personnalisées via Whisper + Mistral 7B.',
            'social-manager'    => 'Planifie le contenu multi-comptes, prédit les horaires optimaux avec Prophet, surveille les commentaires et génère des réponses IA.',
            'content-strategy'  => 'Analyse les concurrents via Meta Graph API, découvre les thèmes avec BERTopic et génère des calendriers de contenu avec Mistral 7B.',
            'content-creator'   => 'Génère des légendes, visuels (SDXL-Turbo) et scripts vidéo personnalisés par client avec workflow d\'approbation avant publication.',
            'analytics'         => 'Collecte les métriques toutes les 6h via Meta Graph API, prédit les performances futures avec Prophet + XGBoost et génère des rapports PDF.',
            'ad-optimizer'      => 'Optimise les campagnes Meta Ads + Google Ads, prédit le CTR avec XGBoost et adapte les enchères avec Q-Learning.',
            'competitive-intel' => 'Surveille jusqu\'à 10 concurrents par client, analyse leurs stratégies avec K-Means + DBSCAN et génère des contre-stratégies avec Mistral 7B.',
            default             => '',
        };
    }

    private function getAgentCapabilities(string $slug): array
    {
        return match($slug) {
            'account-manager'   => ['Transcription réunion (Whisper)', 'Extraction profil client (Mistral 7B)', 'Stratégie 30 jours', 'PDF exportable', 'NER spaCy'],
            'social-manager'    => ['OAuth Meta Graph API', 'Prédiction horaires (Prophet)', 'Sentiment (Twitter-RoBERTa)', 'Réponses IA (Mistral 7B)', 'Planning multi-plateformes'],
            'content-strategy'  => ['Analyse concurrents (Meta API + Playwright)', 'BERTopic clustering', 'LDA topics latents', 'TF-IDF hashtags', 'Calendrier 7 jours'],
            'content-creator'   => ['Légendes adaptées plateforme (Mistral 7B)', 'Visuels 1024×1024 (SDXL-Turbo)', 'Scripts vidéo', 'Workflow approbation', 'Publication Meta'],
            'analytics'         => ['Métriques toutes 6h (Meta Graph)', 'Prédictions 30j (Prophet)', 'Score engagement (XGBoost)', 'Random Forest features', 'Rapports PDF'],
            'ad-optimizer'      => ['Meta Ads + Google Ads', 'Prédiction CTR (XGBoost)', 'Optimisation budget (SciPy)', 'Q-Learning enchères', 'Rapport ROI PDF'],
            'competitive-intel' => ['Surveillance 10 concurrents', 'Sentiment VADER + TextBlob', 'K-Means + DBSCAN clustering', 'Patterns viraux TF-IDF', 'Contre-stratégie Mistral 7B'],
            default             => [],
        };
    }
}