<?php

namespace App\Http\Controllers\Api\Professional\Agents;

use App\Http\Controllers\Controller;
use App\Jobs\CollectMetricsJob;
use App\Models\AgentActivityLog;
use App\Models\AnMetric;
use App\Models\AnReport;
use App\Services\AnalyticsReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class AnalyticsController extends Controller
{
    private string $aiEngineUrl;

    public function __construct(private readonly AnalyticsReportService $reportService)
    {
        $this->aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/analytics/dashboard
    // Pipeline complet : collecte → Prophet → XGBoost → RF → Graphiques → PDF
    // ══════════════════════════════════════════════════════════

    public function dashboard(Request $request): JsonResponse
    {
        $request->validate([
            'sm_account_id' => 'nullable|integer|exists:sm_accounts,id',
            'client_id'     => 'nullable|integer|exists:clients,id',
            'period_days'   => 'nullable|integer|min:7|max:90',
            // 'boolean' n'accepte que true/false/1/0/"1"/"0" — un booléen JS
            // envoyé en query GET (axios) arrive toujours comme la chaîne
            // littérale "true"/"false", que la règle 'boolean' rejette :
            // c'était la cause exacte de "Données invalides." au chargement
            // du dashboard, avant même que ce champ ne soit utilisé
            // (generate_pdf n'est lu nulle part plus bas dans cette méthode).
            'generate_pdf'  => 'nullable|in:0,1,true,false',
        ]);

        /** @var \App\Models\User $user */
        $user      = $request->user();
        $accountId = $request->sm_account_id;
        $clientId  = $request->client_id;
        $period    = $request->period_days ?? 30;

        $result = $this->reportService->generate($user, $accountId, $clientId, $period, 'on_demand');

        if (!$result['success'] && ($result['status'] ?? null) === 'no_data') {
            CollectMetricsJob::dispatch($user);
            return response()->json([
                'success'    => false,
                'message'    => 'Collecte lancée ! Les données seront disponibles dans quelques minutes.',
                'status'     => 'collecting',
                'use_sample' => true,
            ]);
        }

        if (!$result['success']) {
            return response()->json(['success' => false, 'message' => $result['message'] ?? 'AI Engine indisponible.'], 503);
        }

        $ai = $result['ai'];

        // ── Log activité ─────────────────────────────────────
        AgentActivityLog::create([
            'user_id'    => $user->id,
            'client_id'  => $clientId,
            'agent_slug' => 'analytics',
            'agent_name' => 'Agent Analytics IA',
            'action'     => 'dashboard_analyzed',
            'description'=> "Pipeline Analytics complet — {$period}j — Prophet + XGBoost + RF + 7 graphiques",
            'status'     => 'success',
            'metadata'   => [
                'period_days'  => $period,
                'total_posts'  => $ai['kpis']['total_posts'] ?? 0,
                'avg_engagement'=> $ai['kpis']['avg_engagement_rate'] ?? 0,
                'has_pdf'      => !empty($result['pdf_url']),
            ],
            'completed_at' => now(),
        ]);

        return response()->json([
            'success'        => true,
            'kpis'           => $ai['kpis'],
            'weekly_summary' => $ai['weekly_summary'],
            'top_posts'      => $ai['top_posts'],
            'perf_type'      => $ai['perf_type'],
            'perf_platform'  => $ai['perf_platform'],
            'prophet'        => $ai['prophet'],
            'ml_metrics'     => $ai['ml_metrics'],
            'importance'     => $ai['importance'],
            'charts'         => $ai['charts'],     // base64 PNG
            'pdf_url'        => $result['pdf_url'],
            'last_collected' => AnMetric::where('user_id', $user->id)->max('collected_at'),
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/analytics/collect
    // Déclenche manuellement la collecte (Meta Graph API)
    // ══════════════════════════════════════════════════════════

    public function collect(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        CollectMetricsJob::dispatch($user)->onQueue('analytics');

        return response()->json([
            'success' => true,
            'message' => '✅ Collecte Meta Graph API lancée ! Disponible dans quelques minutes.',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/analytics/predict
    // Prédit l'engagement d'un futur post (XGBoost)
    // ══════════════════════════════════════════════════════════

    public function predict(Request $request): JsonResponse
    {
        $request->validate([
            'content_type'    => 'required|string',
            'platform'        => 'required|string',
            'hour'            => 'required|integer|min:0|max:23',
            'day_num'         => 'required|integer|min:0|max:6',
            'estimated_reach' => 'nullable|integer|min:100',
            'sm_account_id'   => 'nullable|integer|exists:sm_accounts,id',
            'client_id'       => 'nullable|integer|exists:clients,id',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        // Mêmes métriques réelles que dashboard() — le modèle XGBoost doit
        // s'entraîner sur les vraies données de l'utilisateur, pas sur un
        // échantillon simulé régénéré à chaque appel (cf. rule 11/14).
        $metricsData = AnMetric::where('user_id', $user->id)
            ->when($request->sm_account_id, fn($q) => $q->where('sm_account_id', $request->sm_account_id))
            ->when($request->client_id,     fn($q) => $q->where('client_id', $request->client_id))
            ->orderBy('collected_at', 'desc')
            ->take(1000)
            ->get()
            ->map(fn($m) => [
                // posted_at = date réelle de publication du post ; collected_at
                // n'est que l'instant où le scraper a tourné (2 valeurs distinctes
                // sur tout le dataset actuel). data_loader.py dérive hour/day_num/
                // day_of_week de ce champ "date" pour la heatmap Heure×Jour, Prophet
                // (minimum 7 jours distincts) et les features XGBoost/RF — avec
                // collected_at, toutes les métriques s'écrasaient sur 1-2 heures,
                // rendant la heatmap quasi vide et Prophet perpétuellement sous le
                // seuil, peu importe le nombre de posts réels accumulés.
                'date'         => $m->posted_at ?? $m->collected_at,
                'platform'     => $m->platform,
                'content_type' => $m->content_type,
                'likes'        => $m->likes,
                'comments'     => $m->comments,
                'shares'       => $m->shares,
                'reach'        => $m->reach,
                'impressions'  => $m->impressions,
                'saves'        => $m->saves,
                'followers'    => $m->followers,
            ])->toArray();

        if (empty($metricsData)) {
            CollectMetricsJob::dispatch($user);
            return response()->json([
                'success' => false,
                'message' => 'Aucune métrique disponible pour entraîner le modèle — collecte lancée.',
                'status'  => 'collecting',
            ], 422);
        }

        try {
            $response = Http::timeout(60)->post(
                "{$this->aiEngineUrl}/analytics/predict",
                [
                    ...$request->only(['content_type', 'platform', 'hour', 'day_num', 'estimated_reach']),
                    'metrics'    => $metricsData,
                    'use_sample' => false,
                ]
            );

            if ($response->failed()) {
                // Distinguer "pas assez de données réelles" (422, cas honnête
                // — XGBoost refuse d'entraîner sous 20 points, cf.
                // engagement_predictor.py train_all_models()) d'une vraie
                // panne (5xx) : les deux étaient auparavant aplatis en un
                // "Erreur prédiction." générique côté Laravel, relayé par un
                // toast tout aussi générique côté frontend — l'utilisateur
                // ne pouvait jamais savoir qu'il lui manquait simplement des
                // données, pas face à un bug.
                $detail = $response->json('detail') ?? $response->body();
                if ($response->status() === 422) {
                    return response()->json([
                        'success' => false,
                        'message' => "Pas assez de métriques réelles pour entraîner XGBoost (minimum 20 posts, "
                            . count($metricsData) . ' actuellement). Continuez à publier ou attendez la prochaine collecte.',
                    ], 422);
                }
                return response()->json(['success' => false, 'message' => "Erreur prédiction : {$detail}"], 500);
            }

            return response()->json(['success' => true, ...$response->json()]);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 503);
        }
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/analytics/reports
    // Historique des rapports PDF (table an_reports)
    // ══════════════════════════════════════════════════════════

    public function reports(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $reports = AnReport::where('user_id', $user->id)
            ->where('status', 'ready')
            ->with('client:id,name')
            ->orderByDesc('period_start')
            ->take(12)
            ->get()
            ->map(fn($r) => [
                'id'           => $r->id,
                'report_type'  => $r->report_type,
                'period_label' => $r->period_label,
                'period_start' => $r->period_start?->toDateString(),
                'client'       => $r->client ? ['id' => $r->client->id, 'name' => $r->client->name] : null,
                'pdf_url'      => $r->pdf_url,
                'created_at'   => $r->created_at->toIso8601String(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => ['reports' => $reports],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/analytics/reports/{id}/download
    // ══════════════════════════════════════════════════════════

    public function downloadReport(Request $request, int $id)
    {
        /** @var \App\Models\User $user */
        $user   = $request->user();
        $report = AnReport::where('user_id', $user->id)->findOrFail($id);

        if (!$report->pdfExists()) {
            return response()->json(['success' => false, 'message' => 'Rapport non disponible.'], 404);
        }

        return Storage::disk('public')->download(
            $report->pdf_path,
            "rapport_analytics_{$report->period_label}.pdf"
        );
    }
}