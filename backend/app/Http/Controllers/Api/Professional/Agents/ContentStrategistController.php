<?php

namespace App\Http\Controllers\Api\Professional\Agents;

use App\Http\Controllers\Controller;
use App\Models\AgentActivityLog;
use App\Models\Client;
use App\Models\CsCalendar;
use App\Models\CsHashtagRec;
use App\Models\CsPillar;
use App\Models\CsStrategy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ContentStrategistController extends Controller
{
    private string $aiEngineUrl;

    public function __construct()
    {
        $this->aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/content-strategy/generate
    // Pipeline : Meta Graph API + Playwright + BERTopic + LDA
    //          + TF-IDF + KMeans + Mistral 7B + ReportLab PDF
    // ══════════════════════════════════════════════════════════

    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'client_id'           => 'nullable|integer|exists:clients,id',
            'niche'               => 'required|string|max:100',
            'secteur'             => 'nullable|string|max:100',
            'audience'            => 'required|string|max:500',
            'objectifs'           => 'nullable|string|max:500',
            'plateformes'         => 'nullable|array',
            'ton'                 => 'nullable|string|max:100',
            'meta_access_token'   => 'nullable|string',
            'competitor_page_ids' => 'nullable|array',
            'instagram_handles'   => 'nullable|array',
            'tiktok_hashtags'     => 'nullable|array',
            'n_topics'            => 'nullable|integer|min:3|max:8',
            'use_bertopic'        => 'nullable|boolean',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        // Créer l'entrée en base
        $strategy = CsStrategy::create([
            'user_id'     => $user->id,
            'client_id'   => $request->client_id,
            'client_name' => $request->niche,
            'niche'       => $request->niche,
            'secteur'     => $request->secteur,
            'audience'    => $request->audience,
            'objectifs'   => $request->objectifs,
            'plateformes' => $request->plateformes ?? ['Instagram', 'TikTok', 'Facebook'],
            'ton'         => $request->ton ?? 'professionnel et accessible',
            'status'      => 'processing',
        ]);

        // Log démarrage
        AgentActivityLog::create([
            'user_id'    => $user->id,
            'client_id'  => $request->client_id,
            'agent_slug' => 'content-strategy',
            'agent_name' => 'Agent Stratège de Contenu',
            'action'     => 'strategy_generation_started',
            'description'=> "Pipeline BERTopic+LDA+TF-IDF+Mistral 7B lancé pour niche : {$request->niche}",
            'status'     => 'running',
            'started_at' => now(),
            'metadata'   => [
                'strategy_id'  => $strategy->id,
                'niche'        => $request->niche,
                'has_meta_api' => !empty($request->meta_access_token),
                'has_scraping' => !empty($request->instagram_handles),
            ],
        ]);

        try {
            // Appel AI Engine (synchrone — max 10 min)
            $response = Http::timeout(600)->post(
                "{$this->aiEngineUrl}/content-strategist/generate",
                [
                    'niche'               => $request->niche,
                    'secteur'             => $request->secteur ?? 'Services',
                    'audience'            => $request->audience,
                    'objectifs'           => $request->objectifs,
                    'plateformes'         => $request->plateformes ?? ['Instagram', 'TikTok', 'Facebook'],
                    'ton'                 => $request->ton ?? 'professionnel et accessible',
                    'meta_access_token'   => $request->meta_access_token,
                    'competitor_page_ids' => $request->competitor_page_ids ?? [],
                    'instagram_handles'   => $request->instagram_handles ?? [],
                    'tiktok_hashtags'     => $request->tiktok_hashtags ?? [],
                    'n_topics'            => $request->n_topics ?? 5,
                    'use_bertopic'        => $request->boolean('use_bertopic', true),
                    'days_back'           => 90,
                ]
            );

            if ($response->failed()) {
                $strategy->update(['status' => 'failed', 'error_message' => $response->body()]);
                return response()->json(['success' => false, 'message' => 'AI Engine indisponible.'], 503);
            }

            $data = $response->json();

            // ── Sauvegarde PDF ReportLab ───────────────────────
            $pdfPath = null;
            if (!empty($data['pdf_base64'])) {
                $pdfContent = base64_decode($data['pdf_base64']);
                $pdfName    = "cs_strategy_{$strategy->id}_{$request->niche}.pdf";
                $pdfPath    = "content_strategies/pdfs/{$pdfName}";
                Storage::disk('local')->put($pdfPath, $pdfContent);
            }

            // ── Mise à jour stratégie principale ──────────────
            $strategyData = $data['strategy'] ?? [];
            $strategy->update([
                'strategie_editoriale'  => $strategyData['strategie_editoriale'] ?? null,
                'tone_of_voice'         => $strategyData['tone_of_voice']        ?? null,
                'frequence_publication' => $strategyData['frequence_publication'] ?? null,
                'recommandations_cles'  => $strategyData['recommandations_cles'] ?? null,
                'corpus_size'           => $data['corpus_size'] ?? 0,
                'data_sources'          => $data['data_sources'] ?? null,
                'pdf_path'              => $pdfPath,
                'status'                => 'completed',
            ]);

            // ── Sauvegarde piliers (BERTopic + LDA) ──────────
            foreach ($data['pillars'] ?? [] as $pillar) {
                CsPillar::create([
                    'cs_strategy_id' => $strategy->id,
                    'pillar_number'  => $pillar['id'],
                    'nom'            => $pillar['nom'],
                    'mots_cles'      => $pillar['mots_cles'],
                    'description'    => $pillar['description'] ?? null,
                    'source_ia'      => $pillar['source']      ?? 'IA',
                    'hashtags'       => $data['hashtags']['pillar_sets'][$pillar['nom']] ?? [],
                ]);
            }

            // ── Sauvegarde calendrier 7 jours ─────────────────
            foreach ($strategyData['calendrier_7_jours'] ?? [] as $day) {
                CsCalendar::create([
                    'cs_strategy_id' => $strategy->id,
                    'jour'           => $day['jour'],
                    'pilier'         => $day['pilier'],
                    'plateforme'     => $day['plateforme'],
                    'type_contenu'   => $day['type_contenu'],
                    'sujet'          => $day['sujet'],
                    'angle'          => $day['angle'] ?? null,
                    'hashtags'       => $day['hashtags'] ?? [],
                ]);
            }

            // ── Sauvegarde top hashtags TF-IDF ────────────────
            foreach ($data['hashtags']['top_scored'] ?? [] as $item) {
                CsHashtagRec::create([
                    'cs_strategy_id' => $strategy->id,
                    'hashtag'        => $item['hashtag'],
                    'tfidf_score'    => $item['tfidf_score'],
                ]);
            }

            // ── Log succès ────────────────────────────────────
            AgentActivityLog::create([
                'user_id'    => $user->id,
                'client_id'  => $request->client_id,
                'agent_slug' => 'content-strategy',
                'agent_name' => 'Agent Stratège de Contenu',
                'action'     => 'strategy_generated',
                'description'=> "Stratégie complète générée — {$request->niche} · {$data['corpus_size']} posts analysés",
                'status'     => 'success',
                'metadata'   => [
                    'strategy_id'  => $strategy->id,
                    'corpus_size'  => $data['corpus_size'] ?? 0,
                    'pillars_count'=> count($data['pillars'] ?? []),
                    'has_pdf'      => !empty($pdfPath),
                    'data_sources' => $data['data_sources'] ?? [],
                ],
                'completed_at' => now(),
            ]);

            return response()->json([
                'success'     => true,
                'message'     => '✅ Stratégie de contenu générée avec succès !',
                'strategy_id' => $strategy->id,
                'data'        => $data,
            ], 201);

        } catch (\Exception $e) {
            Log::error("ContentStrategist erreur : " . $e->getMessage());
            $strategy->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/content-strategy
    // Historique des stratégies
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $clientId = $request->query('client_id');

        $strategies = CsStrategy::where('user_id', $user->id)
            ->when($clientId, fn($q) => $q->where('client_id', $clientId))
            ->with('client:id,name')
            ->orderByDesc('created_at')
            ->take(20)
            ->get()
            ->map(fn($s) => [
                'id'          => $s->id,
                'niche'       => $s->niche,
                'client_name' => $s->client_name,
                'client'      => $s->client ? ['id' => $s->client->id, 'name' => $s->client->name] : null,
                'status'      => $s->status,
                'corpus_size' => $s->corpus_size,
                'has_pdf'     => $s->hasPdf(),
                'created_at'  => $s->created_at->toIso8601String(),
                'created_ago' => $s->created_at->diffForHumans(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => ['strategies' => $strategies],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/content-strategy/{id}
    // Détail complet (piliers + calendrier + hashtags)
    // ══════════════════════════════════════════════════════════

    public function show(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $strategy = CsStrategy::where('user_id', $user->id)
            ->with(['pillars', 'calendars', 'hashtagRecs'])
            ->findOrFail($id);

        // Regrouper les hashtags par pilier
        $hashtagsByPilier = $strategy->pillars->mapWithKeys(
            fn($p) => [$p->nom => $p->hashtags ?? []]
        )->toArray();

        return response()->json([
            'success' => true,
            'data'    => [
                'strategy' => [
                    'id'                   => $strategy->id,
                    'niche'                => $strategy->niche,
                    'secteur'              => $strategy->secteur,
                    'audience'             => $strategy->audience,
                    'objectifs'            => $strategy->objectifs,
                    'plateformes'          => $strategy->plateformes,
                    'ton'                  => $strategy->ton,
                    'strategie_editoriale' => $strategy->strategie_editoriale,
                    'tone_of_voice'        => $strategy->tone_of_voice,
                    'frequence_publication'=> $strategy->frequence_publication,
                    'recommandations_cles' => $strategy->recommandations_cles,
                    'corpus_size'          => $strategy->corpus_size,
                    'data_sources'         => $strategy->data_sources,
                    'status'               => $strategy->status,
                    'has_pdf'              => $strategy->hasPdf(),
                    'created_at'           => $strategy->created_at->toIso8601String(),
                ],
                'pillars'       => $strategy->pillars,
                'calendar'      => $strategy->calendars,
                'hashtags'      => [
                    'pillar_sets'=> $hashtagsByPilier,
                    'top_scored' => $strategy->hashtagRecs->take(20)->map(fn($h) => [
                        'hashtag'    => $h->hashtag,
                        'tfidf_score'=> $h->tfidf_score,
                        'pilier'     => $h->pilier,
                    ]),
                ],
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/content-strategy/{id}/pdf
    // ══════════════════════════════════════════════════════════

    public function downloadPdf(Request $request, int $id)
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $strategy = CsStrategy::where('user_id', $user->id)->findOrFail($id);

        if (!$strategy->pdf_path || !Storage::disk('local')->exists($strategy->pdf_path)) {
            return response()->json(['success' => false, 'message' => 'PDF non disponible.'], 404);
        }

        $pdfContent = Storage::disk('local')->get($strategy->pdf_path);
        $filename   = "strategie_contenu_{$strategy->niche}_{$strategy->id}.pdf";

        return response($pdfContent, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // DELETE /api/professional/agents/content-strategy/{id}
    // ══════════════════════════════════════════════════════════

    public function destroy(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $strategy = CsStrategy::where('user_id', $user->id)->findOrFail($id);

        if ($strategy->pdf_path && Storage::disk('local')->exists($strategy->pdf_path)) {
            Storage::disk('local')->delete($strategy->pdf_path);
        }

        $strategy->delete();

        return response()->json(['success' => true, 'message' => 'Stratégie supprimée.']);
    }
}