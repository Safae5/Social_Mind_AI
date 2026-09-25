<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Models\AgentActivityLog;
use App\Models\HashtagFavorite;
use App\Models\HashtagSearch;
use App\Models\SocialAccount;
use App\Models\TrendCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HashtagSuggesterController extends Controller
{
    private string $aiEngineUrl;

    public function __construct()
    {
        $this->aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/hashtags/generate — Génération avec cache 24h
    // ══════════════════════════════════════════════════════════

    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'subject'    => 'required|string|max:300',
            'platform'   => 'required|in:instagram,tiktok,facebook,linkedin,twitter',
            'language'   => 'nullable|string|max:50',
            'n_hashtags' => 'nullable|integer|min:15|max:30',
        ]);

        /** @var \App\Models\User $user */
        $user      = $request->user();
        $subject   = trim($request->subject);
        $platform  = $request->platform;
        $startedAt = now();

        // ── Vérification cache 24h ────────────────────────────
        $cached = HashtagSearch::where('user_id', $user->id)
            ->where('subject', $subject)
            ->where('platform', $platform)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if ($cached) {
            AgentActivityLog::create([
                'user_id'      => $user->id,
                'agent_slug'   => 'hashtags',
                'agent_name'   => 'Suggesteur de Hashtags',
                'action'       => 'hashtag_generation',
                'description'  => "Résultat servi depuis le cache 24h pour \"{$subject}\"",
                'status'       => 'success',
                'started_at'   => $startedAt,
                'completed_at' => now(),
            ]);
            return response()->json([
                'success'    => true,
                'from_cache' => true,
                'cached_at'  => $cached->created_at->toIso8601String(),
                'cache_until'=> $cached->expires_at->toIso8601String(),
                ...$cached->result_data,
            ]);
        }

        // ── Appel AI Engine ────────────────────────────────────
        try {
            $aiResponse = Http::timeout(120)->post(
                "{$this->aiEngineUrl}/hashtags/generate",
                [
                    'subject'    => $subject,
                    'platform'   => $platform,
                    'language'   => $request->language ?? 'Français',
                    'n_hashtags' => $request->n_hashtags ?? 25,
                ]
            );

            if ($aiResponse->failed()) {
                Log::error('AI Engine hashtags/generate failed', [
                    'status' => $aiResponse->status(),
                    'body'   => $aiResponse->body(),
                ]);
                AgentActivityLog::create([
                    'user_id'      => $user->id,
                    'agent_slug'   => 'hashtags',
                    'agent_name'   => 'Suggesteur de Hashtags',
                    'action'       => 'hashtag_generation',
                    'status'       => 'error',
                    'error_message'=> "HTTP {$aiResponse->status()}",
                    'started_at'   => $startedAt,
                    'completed_at' => now(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur AI Engine — vérifiez que le serveur Python tourne.',
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('AI Engine connection failed', ['error' => $e->getMessage()]);
            AgentActivityLog::create([
                'user_id'      => $user->id,
                'agent_slug'   => 'hashtags',
                'agent_name'   => 'Suggesteur de Hashtags',
                'action'       => 'hashtag_generation',
                'status'       => 'error',
                'error_message'=> $e->getMessage(),
                'started_at'   => $startedAt,
                'completed_at' => now(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Impossible de joindre l\'AI Engine : ' . $e->getMessage(),
            ], 503);
        }

        $data = $aiResponse->json();

        // ── Sauvegarde en cache ────────────────────────────────
        HashtagSearch::create([
            'user_id'           => $user->id,
            'subject'           => $subject,
            'platform'          => $platform,
            'language'          => $request->language ?? 'Français',
            'result_data'       => $data,
            'keywords_detected' => $data['keywords_detected'] ?? [],
            'total_hashtags'    => $data['total'] ?? 0,
            'expires_at'        => now()->addHours(24),
        ]);

        AgentActivityLog::create([
            'user_id'      => $user->id,
            'agent_slug'   => 'hashtags',
            'agent_name'   => 'Suggesteur de Hashtags',
            'action'       => 'hashtag_generation',
            'description'  => "Hashtags générés pour \"{$subject}\" ({$platform})",
            'status'       => 'success',
            'started_at'   => $startedAt,
            'completed_at' => now(),
        ]);

        return response()->json([
            'success'    => true,
            'from_cache' => false,
            ...$data,
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/hashtags/trends — Tendances avec cache 24h partagé
    // ══════════════════════════════════════════════════════════

    public function trends(Request $request): JsonResponse
    {
        $request->validate([
            'subject'  => 'required|string|max:300',
            'platform' => 'required|in:instagram,tiktok,facebook,linkedin,twitter',
            'language' => 'nullable|string|max:50',
        ]);

        /** @var \App\Models\User $user */
        $user     = $request->user();
        $subject  = trim($request->subject);
        $platform = $request->platform;

        // ── Cache par utilisateur (24h) ────────────────────────
        $cached = TrendCache::where('user_id', $user->id)
            ->where('subject', $subject)
            ->where('platform', $platform)
            ->where('expires_at', '>', now())
            ->first();

        if ($cached) {
            return response()->json([
                'success'    => true,
                'from_cache' => true,
                ...$cached->trends_data,
            ]);
        }

        // ── Compte Instagram CONNECTÉ PAR CET UTILISATEUR ──────
        // Ne jamais laisser l'AI Engine retomber sur un token global : sans
        // ça, tous les utilisateurs recevaient les tendances réelles d'UN
        // SEUL compte Meta (celui configuré dans l'env de l'AI Engine).
        $igAccount = SocialAccount::where('user_id', $user->id)
            ->where('platform', 'instagram')
            ->active()
            ->first();

        // ── Appel AI Engine ────────────────────────────────────
        try {
            $aiResponse = Http::timeout(120)->post(
                "{$this->aiEngineUrl}/hashtags/trends",
                [
                    'subject'      => $subject,
                    'platform'     => $platform,
                    'language'     => $request->language ?? 'Français',
                    'access_token' => $igAccount?->getDecryptedAccessToken(),
                    'ig_user_id'   => $igAccount?->platform_user_id,
                ]
            );

            if ($aiResponse->failed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur AI Engine trends.',
                ], 500);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de joindre l\'AI Engine.',
            ], 503);
        }

        $data = $aiResponse->json();

        // ── Sauvegarde en cache (scopé par utilisateur) ────────
        TrendCache::updateOrCreate(
            ['user_id' => $user->id, 'subject' => $subject, 'platform' => $platform],
            [
                'trends_data' => $data,
                'sources_used'=> $data['sources_used'] ?? [],
                'expires_at'  => now()->addHours(24),
            ]
        );

        return response()->json([
            'success'    => true,
            'from_cache' => false,
            ...$data,
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/hashtags/history — Historique 10 dernières recherches
    // ══════════════════════════════════════════════════════════

    public function history(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $history = HashtagSearch::where('user_id', $user->id)
            ->where('expires_at', '>', now())
            ->orderByDesc('created_at')
            ->take(10)
            ->get()
            ->map(fn($s) => [
                'id'              => $s->id,
                'subject'         => $s->subject,
                'platform'        => $s->platform,
                'total_hashtags'  => $s->total_hashtags,
                'keywords'        => $s->keywords_detected ?? [],
                'created_at'      => $s->created_at->toIso8601String(),
                'expires_at'      => $s->expires_at->toIso8601String(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => ['history' => $history],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/hashtags/favorites — Liste des favoris
    // ══════════════════════════════════════════════════════════

    public function favorites(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user      = $request->user();
        $favorites = HashtagFavorite::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'favorites' => $favorites,
                'count'     => $favorites->count(),
                'max'       => 20,
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/hashtags/favorites — Sauvegarder un ensemble
    // ══════════════════════════════════════════════════════════

    public function saveFavorite(Request $request): JsonResponse
    {
        $request->validate([
            'name'     => 'required|string|max:100',
            'subject'  => 'required|string|max:300',
            'platform' => 'required|in:instagram,tiktok,facebook,linkedin,twitter',
            'hashtags' => 'required|array|min:1|max:30',
            'hashtags.*'  => 'string',
            'categorized' => 'nullable|array',
            'notes'    => 'nullable|string|max:500',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        // Vérifie la limite de 20 favoris
        $count = HashtagFavorite::where('user_id', $user->id)->count();
        if ($count >= 20) {
            return response()->json([
                'success' => false,
                'message' => 'Maximum 20 ensembles de favoris atteint. Supprimez-en un pour continuer.',
            ], 400);
        }

        $favorite = HashtagFavorite::create([
            'user_id'    => $user->id,
            'name'       => $request->name,
            'subject'    => $request->subject,
            'platform'   => $request->platform,
            'hashtags'   => $request->hashtags,
            'categorized'=> $request->categorized ?? [],
            'notes'      => $request->notes,
            'times_used' => 0,
        ]);

        return response()->json([
            'success' => true,
            'message' => '⭐ Ensemble sauvegardé !',
            'data'    => ['favorite' => $favorite],
        ], 201);
    }

    // ══════════════════════════════════════════════════════════
    // PUT /api/hashtags/favorites/{id} — Modifier
    // ══════════════════════════════════════════════════════════

    public function updateFavorite(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|string|max:100',
            'notes'=> 'nullable|string|max:500',
        ]);

        /** @var \App\Models\User $user */
        $user     = $request->user();
        $favorite = HashtagFavorite::where('user_id', $user->id)->findOrFail($id);

        $favorite->update($request->only(['name', 'notes']));

        return response()->json([
            'success' => true,
            'message' => 'Ensemble modifié.',
            'data'    => ['favorite' => $favorite],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // DELETE /api/hashtags/favorites/{id} — Supprimer
    // ══════════════════════════════════════════════════════════

    public function deleteFavorite(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $favorite = HashtagFavorite::where('user_id', $user->id)->findOrFail($id);
        $favorite->delete();

        return response()->json([
            'success' => true,
            'message' => 'Ensemble supprimé.',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/hashtags/favorites/{id}/use — Incrémenter compteur
    // ══════════════════════════════════════════════════════════

    public function useFavorite(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $favorite = HashtagFavorite::where('user_id', $user->id)->findOrFail($id);
        $favorite->incrementUsage();

        return response()->json([
            'success'    => true,
            'times_used' => $favorite->fresh()->times_used,
        ]);
    }
}