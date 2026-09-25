<?php

namespace App\Http\Controllers\Api\Professional\Agents;

use App\Http\Controllers\Controller;
use App\Jobs\CollectCompetitorDataJob;
use App\Models\AgentActivityLog;
use App\Models\CiCompetitorAccount;
use App\Models\CiCompetitorPost;
use App\Models\CiReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CompetitiveIntelController extends Controller
{
    private string $aiEngineUrl;

    public function __construct()
    {
        $this->aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/competitive-intel/competitors
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $clientId = $request->query('client_id');

        $competitors = CiCompetitorAccount::where('user_id', $user->id)
            ->when($clientId, fn($q) => $q->where('client_id', $clientId))
            ->orderByDesc('is_active')
            ->get()
            ->map(fn($c) => [
                'id'              => $c->id,
                'name'            => $c->name,
                'platform'        => $c->platform,
                'username'        => $c->username,
                'profile_url'     => $c->profile_url,
                'followers_count' => $c->followers_count,
                'is_active'       => $c->is_active,
                'last_scraped_at' => $c->last_scraped_at?->toDateTimeString(),
                'posts_count'     => CiCompetitorPost::where('ci_competitor_account_id', $c->id)->count(),
            ]);

        return response()->json([
            'success'     => true,
            'competitors' => $competitors,
            'count'       => $competitors->count(),
            'max'         => 10,
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/competitive-intel/competitors
    // ══════════════════════════════════════════════════════════

    // Plateformes réellement collectées (Meta Graph API). TikTok/LinkedIn
    // restent des valeurs de platform valides côté schéma mais ne sont pas
    // encore scrapées — CollectCompetitorDataJob les ignore silencieusement,
    // donc on bloque leur création ici plutôt que de perdre la demande sans
    // que l'utilisateur ne le sache (cf. rule 14, anti-fabrication).
    private const SUPPORTED_PLATFORMS = ['instagram', 'facebook'];

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'        => 'required|string|max:100',
            'platform'    => 'required|in:instagram,facebook,tiktok,linkedin',
            'username'    => 'nullable|string|max:100',
            'platform_id' => 'nullable|string|max:100',
            'profile_url' => 'nullable|url',
            'client_id'   => 'nullable|integer|exists:clients,id',
        ]);

        if (!in_array($request->platform, self::SUPPORTED_PLATFORMS, true)) {
            return response()->json([
                'success' => false,
                'message' => "Le suivi concurrentiel {$request->platform} n'est pas encore disponible — seuls Instagram et Facebook sont supportés actuellement.",
            ], 422);
        }

        /** @var \App\Models\User $user */
        $user  = $request->user();
        $count = CiCompetitorAccount::where('user_id', $user->id)->count();

        if ($count >= 10) {
            return response()->json([
                'success' => false,
                'message' => 'Limite de 10 concurrents atteinte. Supprimez un concurrent pour en ajouter un nouveau.',
            ], 422);
        }

        // Un concurrent est par définition un compte qu'on ne gère pas : on
        // n'a jamais de vrai ID numérique Meta pour lui, et le champ
        // "username" est rempli par l'utilisateur avec ce qu'il voit sur la
        // page — souvent son NOM D'AFFICHAGE ("Fitness Gym"), pas son
        // identifiant Facebook réel (sans espaces, ex. "fitnessgym.rabat").
        // Un nom avec espaces n'est pas un identifiant Graph API valide (la
        // requête échoue avant même de partir). La seule donnée qu'un
        // utilisateur peut réellement fournir pour un concurrent est l'URL
        // de sa page — on en extrait le vrai identifiant ici.
        $platformId = $request->platform_id ?: $this->extractFacebookIdentifier($request->profile_url);

        $competitor = CiCompetitorAccount::create([
            'user_id'     => $user->id,
            'client_id'   => $request->client_id,
            'name'        => $request->name,
            'platform'    => $request->platform,
            'username'    => $request->username,
            'platform_id' => $platformId,
            'profile_url' => $request->profile_url,
            'is_active'   => true,
        ]);

        CollectCompetitorDataJob::dispatch($user)->onQueue('competitive_intel');

        AgentActivityLog::create([
            'user_id'     => $user->id,
            'client_id'   => $request->client_id,
            'agent_slug'  => 'competitive-intel',
            'agent_name'  => 'Agent Veille Concurrentielle',
            'action'      => 'competitor_added',
            'description' => "Concurrent ajouté : {$request->name} ({$request->platform})",
            'status'      => 'success',
            'metadata'    => ['competitor_id' => $competitor->id],
        ]);

        return response()->json([
            'success'    => true,
            'competitor' => $competitor,
            'message'    => '✅ Concurrent ajouté ! Collecte lancée.',
        ], 201);
    }

    // ── Extrait l'identifiant Graph API d'une URL de Page Facebook ────
    // Supporte /{slug} (vanity URL) et /profile.php?id=123 (ID numérique).
    private function extractFacebookIdentifier(?string $url): ?string
    {
        if (!$url) {
            return null;
        }

        $path = trim((string) parse_url($url, PHP_URL_PATH), '/');
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);

        if (!empty($query['id'])) {
            return $query['id'];
        }

        return $path !== '' ? $path : null;
    }

    // ══════════════════════════════════════════════════════════
    // DELETE /api/professional/agents/competitive-intel/competitors/{id}
    // ══════════════════════════════════════════════════════════

    public function destroy(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $comp = CiCompetitorAccount::where('user_id', $user->id)->findOrFail($id);

        CiCompetitorPost::where('ci_competitor_account_id', $id)->delete();
        $comp->delete();

        return response()->json([
            'success' => true,
            'message' => '✅ Concurrent supprimé.',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/competitive-intel/analyze
    // ══════════════════════════════════════════════════════════

    public function analyze(Request $request): JsonResponse
    {
        $request->validate([
            'client_id'    => 'nullable|integer|exists:clients,id',
            'client_brand' => 'nullable|string|max:200',
            'client_niche' => 'nullable|string|max:200',
        ]);

        /** @var \App\Models\User $user */
        $user     = $request->user();
        $clientId = $request->client_id;

        // ── Récupère les posts depuis ci_competitor_posts ─────
        $posts = CiCompetitorPost::where('user_id', $user->id)
            ->when(
                $clientId,
                fn($q) => $q->whereHas(
                    'competitorAccount',
                    fn($q2) => $q2->where('client_id', $clientId)
                )
            )
            ->where('posted_at', '>=', now()->subDays(30))
            ->orderBy('posted_at', 'desc')
            ->take(1000)
            ->get()
            ->map(fn($p) => [
                'competitor'   => $p->competitor,
                'platform'     => $p->platform,
                'caption'      => $p->caption,
                'content_type' => $p->content_type,
                'likes'        => $p->likes,
                'comments'     => $p->comments,
                'shares'       => $p->shares,
                'reach'        => $p->reach,
                'hashtags'     => $p->hashtags,
                'date'         => $p->posted_at?->toISOString(),
            ])
            ->toArray();

        // ── Pas de données → lancer la collecte ──────────────
        if (empty($posts)) {
            CollectCompetitorDataJob::dispatch($user)->onQueue('competitive_intel');
            return response()->json([
                'success' => false,
                'message' => '✅ Collecte lancée ! Disponible dans quelques minutes.',
                'status'  => 'collecting',
            ]);
        }

        // ── Résoudre client name / brand / niche ─────────────
        $clientName  = $user->full_name;
        $clientBrand = $request->client_brand ?? $user->full_name;
        $clientNiche = $request->client_niche ?? 'Marketing digital';

        if ($clientId) {
            $client      = \App\Models\Client::find($clientId);
            $clientName  = $client?->name  ?? $user->full_name;
            $clientBrand = $request->client_brand ?? $client?->name  ?? $user->full_name;
            $clientNiche = $request->client_niche ?? $client?->niche ?? 'Marketing digital';
        }

        // ── Appel AI Engine FastAPI ───────────────────────────
        try {
            $aiResponse = Http::timeout(300)->post(
                "{$this->aiEngineUrl}/competitive-intel/analyze",
                [
                    'client_name'  => $clientName,
                    'client_brand' => $clientBrand,
                    'client_niche' => $clientNiche,
                    'posts'        => $posts,
                    'generate_pdf' => true,
                    'use_sample'   => false,
                ]
            );

            if ($aiResponse->failed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'AI Engine indisponible.',
                ], 503);
            }

        } catch (\Exception $e) {
            Log::error("CompetitiveIntel AI Engine: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 503);
        }

        $ai = $aiResponse->json();

        // ── Sauvegarde PDF ────────────────────────────────────
        $pdfUrl  = null;
        $pdfPath = null;

        if (!empty($ai['pdf_base64'])) {
            try {
                $pdfPath    = "ci_reports/{$user->id}/veille_" . now()->format('Y-m-d') . ".pdf";
                $pdfContent = base64_decode($ai['pdf_base64']);

                Storage::disk('public')->put($pdfPath, $pdfContent);

                // ✅ FIX : Storage::url() au lieu de Storage::disk('public')->url()
                // Storage::url() utilise la config filesystems.disks.public.url
                // définie dans config/filesystems.php — toujours disponible
                $pdfUrl = Storage::url($pdfPath);

                // ── Enregistre dans ci_reports ─────────────────
                CiReport::create([
                    'user_id'          => $user->id,
                    'client_id'        => $clientId,
                    'client_brand'     => $clientBrand,
                    'client_niche'     => $clientNiche,
                    'n_competitors'    => $ai['metadata']['n_competitors'] ?? 0,
                    'n_posts_analyzed' => $ai['metadata']['total_posts']   ?? 0,
                    'score_menace'     => $ai['strategy']['score_menace_concurrentielle'] ?? null,
                    'pdf_path'         => $pdfPath,
                    'pdf_url'          => $pdfUrl,
                    'strategy_summary' => [
                        'resume_executif' => $ai['strategy']['resume_executif'] ?? '',
                        'top_competitor'  => $ai['metadata']['top_competitor']  ?? '',
                    ],
                    'status' => 'ready',
                ]);

            } catch (\Exception $e) {
                Log::warning("CiReport PDF save error: " . $e->getMessage());
                // On continue même si le PDF échoue — les données IA restent disponibles
            }
        }

        // ── Log activité ──────────────────────────────────────
        AgentActivityLog::create([
            'user_id'     => $user->id,
            'client_id'   => $clientId,
            'agent_slug'  => 'competitive-intel',
            'agent_name'  => 'Agent Veille Concurrentielle',
            'action'      => 'analysis_completed',
            'description' => "Analyse veille — {$clientBrand} — " .
                             ($ai['metadata']['n_competitors'] ?? 0) . " concurrents — " .
                             "Score menace : " . ($ai['strategy']['score_menace_concurrentielle'] ?? 'N/A'),
            'status'      => 'success',
            'metadata'    => [
                'n_competitors' => $ai['metadata']['n_competitors'] ?? 0,
                'total_posts'   => $ai['metadata']['total_posts']   ?? 0,
                'viral_posts'   => $ai['metadata']['viral_posts']   ?? 0,
                'score_menace'  => $ai['strategy']['score_menace_concurrentielle'] ?? 0,
                'has_pdf'       => !empty($pdfPath),
            ],
            'completed_at' => now(),
        ]);

        return response()->json([
            'success'        => true,
            'metadata'       => $ai['metadata'],
            'sentiment'      => $ai['sentiment'],
            'cluster_result' => $ai['cluster_result'],
            'viral_patterns' => $ai['viral_patterns'],
            'strategy'       => $ai['strategy'],
            'charts'         => $ai['charts'],
            'pdf_url'        => $pdfUrl,
            'last_collected' => CiCompetitorPost::where('user_id', $user->id)->max('created_at'),
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/competitive-intel/collect
    // ══════════════════════════════════════════════════════════

    public function collect(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        CollectCompetitorDataJob::dispatch($user)->onQueue('competitive_intel');

        return response()->json([
            'success' => true,
            'message' => '✅ Collecte lancée ! Meta Graph API + Playwright.',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/competitive-intel/reports
    // ══════════════════════════════════════════════════════════

    public function reports(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $clientId = $request->query('client_id');

        $reports = CiReport::where('user_id', $user->id)
            ->where('status', 'ready')
            ->when($clientId, fn($q) => $q->where('client_id', $clientId))
            ->with('client:id,name')
            ->orderByDesc('created_at')
            ->take(10)
            ->get()
            ->map(fn($r) => [
                'id'            => $r->id,
                'client_brand'  => $r->client_brand,
                'client_niche'  => $r->client_niche,
                'client'        => $r->client
                    ? ['id' => $r->client->id, 'name' => $r->client->name]
                    : null,
                'n_competitors' => $r->n_competitors,
                'n_posts'       => $r->n_posts_analyzed,
                'score_menace'  => $r->score_menace,
                'threat_level'  => $r->threatLevel(),
                'pdf_url'       => $r->pdf_url,
                'created_at'    => $r->created_at->toIso8601String(),
                'created_ago'   => $r->created_at->diffForHumans(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => ['reports' => $reports],
        ]);
    }
}