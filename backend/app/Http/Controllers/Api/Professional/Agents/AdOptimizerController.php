<?php

namespace App\Http\Controllers\Api\Professional\Agents;

use App\Http\Controllers\Controller;
use App\Jobs\CollectAdMetricsJob;
use App\Models\AgentActivityLog;
use App\Models\AoAccount;
use App\Models\AoCampaign;
use App\Models\AoReport;
use App\Models\SocialAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class AdOptimizerController extends Controller
{
    private string $aiEngineUrl;

    public function __construct()
    {
        $this->aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/ad-optimizer/analyze
    // XGBoost CTR + RF/GB Segments + SciPy linprog + Q-Learning + PDF
    // ══════════════════════════════════════════════════════════

    public function analyze(Request $request): JsonResponse
    {
        $request->validate([
            'client_id'    => 'nullable|integer|exists:clients,id',
            'total_budget' => 'nullable|numeric|min:100',
            'run_qlearning'=> 'nullable|boolean',
            'generate_pdf' => 'nullable|boolean',
        ]);

        /** @var \App\Models\User $user */
        $user     = $request->user();
        $clientId = $request->client_id;

        // Récupère les métriques depuis ao_campaigns
        $campaigns = $this->recentCampaigns($user, $clientId, 500);
        $hasLinkedAccount = AoAccount::where('user_id', $user->id)->active()->exists();

        if (empty($campaigns) && $hasLinkedAccount) {
            // Un compte est lié mais la première collecte n'est pas encore arrivée
            CollectAdMetricsJob::dispatch($user)->onQueue('ad_optimizer');
            return response()->json([
                'success'    => false,
                'message'    => 'Collecte lancée ! Les données seront disponibles dans quelques minutes.',
                'status'     => 'collecting',
                'use_sample' => false,
            ]);
        }

        $useSample = empty($campaigns);

        // Récupère le nom client pour le rapport
        $clientName = $user->name ?? $user->full_name ?? $user->email;
        if ($clientId) {
            $client     = \App\Models\Client::find($clientId);
            $clientName = $client?->name ?? $clientName;
        }

        try {
            $response = Http::timeout(300)->post(
                "{$this->aiEngineUrl}/ad-optimizer/analyze",
                [
                    'client_name'  => $clientName,
                    'campaigns'    => $campaigns,
                    'total_budget' => $request->total_budget ?? 5000,
                    'run_qlearning'=> $request->boolean('run_qlearning', true),
                    'generate_pdf' => $request->boolean('generate_pdf', true),
                    'use_sample'   => $useSample,
                ]
            );

            if ($response->failed()) {
                return response()->json(['success' => false, 'message' => 'AI Engine indisponible.'], 503);
            }

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 503);
        }

        $ai = $response->json();

        // ── Sauvegarde PDF ReportLab ────────────────────────
        $pdfUrl  = null;
        $pdfPath = null;
        if (!empty($ai['pdf_base64'])) {
            try {
                $pdfPath = "ao_reports/{$user->id}/rapport_roi_" . now()->format('Y-W') . ".pdf";
                Storage::disk('public')->put($pdfPath, base64_decode($ai['pdf_base64']));
                $pdfUrl  = Storage::disk('public')->url($pdfPath);

                // Enregistre dans ao_reports
                AoReport::updateOrCreate(
                    [
                        'user_id'      => $user->id,
                        'report_type'  => 'weekly',
                        'period_start' => now()->startOfWeek(),
                    ],
                    [
                        'client_id'            => $clientId,
                        'client_name'          => $clientName,
                        'period_end'           => now()->endOfWeek(),
                        'pdf_path'             => $pdfPath,
                        'pdf_url'              => $pdfUrl,
                        'kpis_summary'         => $ai['metadata'] ?? [],
                        'roas_before'          => $ai['opt_result']['roas_before']     ?? null,
                        'roas_after'           => $ai['opt_result']['roas_after']      ?? null,
                        'roas_improvement_pct' => $ai['opt_result']['improvement_pct'] ?? null,
                        'status'               => 'ready',
                    ]
                );
            } catch (\Exception $e) {
                Log::warning("AoReport PDF save: " . $e->getMessage());
            }
        }

        // ── Log activité ─────────────────────────────────────
        AgentActivityLog::create([
            'user_id'    => $user->id,
            'client_id'  => $clientId,
            'agent_slug' => 'ad-optimizer',
            'agent_name' => 'Agent Optimisation Publicitaire',
            'action'     => 'pipeline_analyzed',
            'description'=> "Pipeline Ad Optimizer — {$clientName} — " .
                            ($ai['metadata']['total_campaigns'] ?? 0) . " campagnes analysées",
            'status'     => 'success',
            'metadata'   => [
                'total_campaigns' => $ai['metadata']['total_campaigns'] ?? 0,
                'overall_roas'    => $ai['metadata']['overall_roas']    ?? 0,
                'roas_after'      => $ai['opt_result']['roas_after']    ?? 0,
                'improvement_pct' => $ai['opt_result']['improvement_pct'] ?? 0,
                'has_pdf'         => !empty($pdfPath),
            ],
            'completed_at' => now(),
        ]);

        return response()->json([
            'success'          => true,
            'data_source'      => $useSample ? 'simulated' : 'real',
            'demo_message'     => $useSample
                ? 'Aucun compte publicitaire connecté — données de démonstration. Connectez un compte Meta Ads pour des données réelles.'
                : null,
            'metadata'         => $ai['metadata'],
            'campaign_metrics' => $ai['campaign_metrics'],
            'underperforming'  => $ai['underperforming'],
            'ctr_model'        => $ai['ctr_model'],
            'segment_result'   => $ai['segment_result'],
            'opt_result'       => $ai['opt_result'],
            'q_result'         => $ai['q_result'],
            'charts'           => $ai['charts'],   // base64 PNG
            'pdf_url'          => $pdfUrl,
            'last_collected'   => AoCampaign::where('user_id', $user->id)->max('updated_at'),
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // Récupère les campagnes récentes de l'utilisateur (ao_campaigns)
    // ══════════════════════════════════════════════════════════

    private function recentCampaigns(\App\Models\User $user, ?int $clientId = null, int $limit = 200): array
    {
        return AoCampaign::where('user_id', $user->id)
            ->when($clientId, fn($q) => $q->where('client_id', $clientId))
            ->orderBy('date_start', 'desc')
            ->take($limit)
            ->get()
            ->map(fn($c) => [
                'campaign_id'    => $c->campaign_id,
                'campaign_name'  => $c->campaign_name,
                'platform'       => $c->platform,
                'ad_type'        => $c->ad_type,
                'audience_age'   => $c->audience_age,
                'audience_gender'=> $c->audience_gender,
                'impressions'    => $c->impressions,
                'clicks'         => $c->clicks,
                'spend'          => $c->spend,
                'conversions'    => $c->conversions,
                'revenue'        => $c->revenue,
                'date'           => $c->date_start,
            ])->toArray();
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/ad-optimizer/connectable-accounts
    // Liste les comptes Facebook liés + leurs comptes publicitaires Meta Ads
    // ══════════════════════════════════════════════════════════

    public function connectableAccounts(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $pages = SocialAccount::where('user_id', $user->id)
            ->where('platform', 'facebook')
            ->active()
            ->get();

        $graphVersion = config('services.meta.graph_version', 'v21.0');
        $results      = [];

        foreach ($pages as $page) {
            $token = $page->getDecryptedAccessToken();
            $adAccounts = [];

            if ($token) {
                try {
                    $resp = Http::timeout(15)->get(
                        "https://graph.facebook.com/{$graphVersion}/me/adaccounts",
                        [
                            'fields'       => 'id,name,account_status,currency',
                            'access_token' => $token,
                        ]
                    );
                    if ($resp->successful()) {
                        $adAccounts = collect($resp->json('data', []))->map(fn($a) => [
                            'id'     => $a['id'],
                            'name'   => $a['name']   ?? $a['id'],
                            'status' => $a['account_status'] ?? null,
                            'currency'=> $a['currency'] ?? null,
                        ])->values()->toArray();
                    }
                } catch (\Exception $e) {
                    Log::warning("AdOptimizer connectableAccounts /me/adaccounts: " . $e->getMessage());
                }
            }

            $results[] = [
                'social_account_id' => $page->id,
                'page_name'         => $page->page_name ?? $page->name,
                'ad_accounts'       => $adAccounts,
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => ['accounts' => $results],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/ad-optimizer/connect
    // Lie un compte publicitaire Meta Ads (ao_accounts)
    // ══════════════════════════════════════════════════════════

    public function connect(Request $request): JsonResponse
    {
        $request->validate([
            'social_account_id' => 'required|integer|exists:social_accounts,id',
            'ad_account_id'     => 'required|string',
            'ad_account_name'   => 'nullable|string',
            'client_id'         => 'nullable|integer|exists:clients,id',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $page = SocialAccount::where('id', $request->social_account_id)
            ->where('user_id', $user->id)
            ->where('platform', 'facebook')
            ->firstOrFail();

        $token = $page->getDecryptedAccessToken();
        if (!$token) {
            return response()->json([
                'success' => false,
                'message' => 'Token Facebook invalide. Reconnectez le compte.',
            ], 400);
        }

        $account = AoAccount::updateOrCreate(
            [
                'user_id'             => $user->id,
                'platform'            => 'meta',
                'platform_account_id' => $request->ad_account_id,
            ],
            [
                'client_id'    => $request->client_id,
                'account_name' => $request->ad_account_name ?? $request->ad_account_id,
                'access_token' => $token,
                'is_active'    => true,
            ]
        );

        AgentActivityLog::create([
            'user_id'    => $user->id,
            'client_id'  => $request->client_id,
            'agent_slug' => 'ad-optimizer',
            'agent_name' => 'Agent Optimisation Publicitaire',
            'action'     => 'ad_account_connected',
            'description'=> "Compte publicitaire Meta Ads connecté : {$account->account_name}",
            'status'     => 'success',
            'completed_at' => now(),
        ]);

        // Première collecte immédiate
        CollectAdMetricsJob::dispatch($user)->onQueue('ad_optimizer');

        return response()->json([
            'success' => true,
            'message' => '✅ Compte publicitaire connecté ! Collecte des métriques en cours.',
            'data'    => ['account_id' => $account->id],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/ad-optimizer/collect
    // ══════════════════════════════════════════════════════════

    public function collect(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        CollectAdMetricsJob::dispatch($user)->onQueue('ad_optimizer');
        return response()->json([
            'success' => true,
            'message' => '✅ Collecte Meta Ads + Google Ads lancée ! Disponible dans quelques minutes.',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/ad-optimizer/predict-ctr
    // Prédiction CTR XGBoost
    // ══════════════════════════════════════════════════════════

    public function predictCTR(Request $request): JsonResponse
    {
        $request->validate([
            'ad_type'               => 'required|string',
            'platform'              => 'required|string',
            'age'                   => 'required|string',
            'gender'                => 'required|string',
            'estimated_spend'       => 'nullable|numeric',
            'estimated_impressions' => 'nullable|integer',
            'day_of_week'           => 'nullable|integer|min:0|max:6',
        ]);

        try {
            $response = Http::timeout(60)->post(
                "{$this->aiEngineUrl}/ad-optimizer/predict-ctr",
                array_merge(
                    $request->only(['ad_type','platform','age','gender',
                                     'estimated_spend','estimated_impressions','day_of_week']),
                    ['campaigns' => $this->recentCampaigns($request->user())]
                )
            );

            if ($response->failed()) {
                return response()->json(['success' => false, 'message' => 'Erreur prédiction CTR.'], 500);
            }

            return response()->json(['success' => true, ...$response->json()]);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 503);
        }
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/ad-optimizer/bid-recommendation
    // Recommandation enchère Q-Learning
    // ══════════════════════════════════════════════════════════

    public function bidRecommendation(Request $request): JsonResponse
    {
        $request->validate([
            'performance_score'    => 'nullable|numeric|min:0|max:100',
            'budget_remaining_pct' => 'nullable|numeric|min:0|max:100',
            'is_weekend'           => 'nullable|boolean',
            'current_bid'          => 'nullable|numeric|min:0.01',
        ]);

        try {
            $response = Http::timeout(60)->post(
                "{$this->aiEngineUrl}/ad-optimizer/bid-recommendation",
                array_merge(
                    $request->only(['performance_score','budget_remaining_pct','is_weekend','current_bid']),
                    ['campaigns' => $this->recentCampaigns($request->user())]
                )
            );

            if ($response->failed()) {
                return response()->json(['success' => false, 'message' => 'Erreur Q-Learning.'], 500);
            }

            return response()->json(['success' => true, ...$response->json()]);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 503);
        }
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/ad-optimizer/reports
    // ══════════════════════════════════════════════════════════

    public function reports(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $reports = AoReport::where('user_id', $user->id)
            ->where('status', 'ready')
            ->with('client:id,name')
            ->orderByDesc('period_start')
            ->take(12)
            ->get()
            ->map(fn($r) => [
                'id'                   => $r->id,
                'report_type'          => $r->report_type,
                'period_start'         => $r->period_start?->toDateString(),
                'period_end'           => $r->period_end?->toDateString(),
                'client'               => $r->client ? ['id' => $r->client->id, 'name' => $r->client->name] : null,
                'pdf_url'              => $r->pdf_url,
                'roas_before'          => $r->roas_before,
                'roas_after'           => $r->roas_after,
                'roas_improvement_pct' => $r->roas_improvement_pct,
                'created_at'           => $r->created_at->toIso8601String(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => ['reports' => $reports],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/ad-optimizer/reports/{id}/download
    // ══════════════════════════════════════════════════════════

    public function downloadReport(Request $request, int $id)
    {
        /** @var \App\Models\User $user */
        $user   = $request->user();
        $report = AoReport::where('user_id', $user->id)->findOrFail($id);

        if (!$report->pdfExists()) {
            return response()->json(['success' => false, 'message' => 'Rapport non disponible.'], 404);
        }

        return Storage::disk('public')->download(
            $report->pdf_path,
            "rapport_roi_{$report->period_start}.pdf"
        );
    }
}