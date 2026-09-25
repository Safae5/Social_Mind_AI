<?php

namespace App\Http\Controllers\Api\Professional\Agents;

use App\Http\Controllers\Controller;
use App\Models\AgentActivityLog;
use App\Models\Client;
use App\Models\SmCommentInbox;
use App\Models\SmContentQueue;
use App\Models\SmEngagementMetric;
use App\Models\SmProphetSlot;
use App\Models\SmAccount;
use App\Models\SocialAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SocialManagerController extends Controller
{
    private string $aiEngineUrl;

    public function __construct()
    {
        $this->aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/social-manager/accounts
    // Comptes sociaux connectés (sans tokens)
    // ══════════════════════════════════════════════════════════

    public function accounts(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $accounts = SmAccount::where('user_id', $user->id)
            ->active()
            ->get()
            ->map(fn($a) => [
                'id'           => $a->id,
                'platform'     => $a->platform,
                'account_name' => $a->account_name,
                'account_type' => $a->account_type,
                'account_id'   => $a->account_id,
            ]);

        return response()->json([
            'success'  => true,
            'data'     => ['accounts' => $accounts],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/social-manager/connectable-accounts
    // Comptes sociaux déjà liés (via OAuth) mais pas encore assignés
    // à un client Social Manager — pour le sélecteur du frontend.
    // ══════════════════════════════════════════════════════════

    public function connectableAccounts(Request $request): JsonResponse
    {
        $user = $request->user();

        $accounts = SocialAccount::where('user_id', $user->id)
            ->where('is_active', true)
            ->get()
            ->map(fn($a) => [
                'id'           => $a->id,
                'platform'     => $a->platform,
                'account_name' => $a->platform_display_name ?: $a->page_name,
                'account_handle' => $a->platform_username,
            ]);

        return response()->json([
            'success' => true,
            'data'    => ['accounts' => $accounts],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/social-manager/connect
    // Assigne un compte social déjà lié (OAuth) à un client donné —
    // crée/actualise le SmAccount correspondant.
    // ══════════════════════════════════════════════════════════

    public function connect(Request $request): JsonResponse
    {
        $request->validate([
            'social_account_id' => 'required|integer',
            'client_id'         => 'required|integer',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $socialAccount = SocialAccount::where('user_id', $user->id)
            ->findOrFail($request->social_account_id);

        $client = Client::where('user_id', $user->id)
            ->findOrFail($request->client_id);

        // Token de Page en priorité : SmAccount n'a qu'un seul champ token,
        // utilisé ensuite pour TOUS les appels Graph API (historique Prophet
        // inclus) — Meta exige le token de Page pour lire les posts/insights
        // d'une Page, pas le token utilisateur (même contrainte que
        // SchedulerService::runAnalysisNow() et FetchInboxMessagesJob).
        // Avec le token utilisateur, chaque appel Graph API échouait
        // silencieusement, l'historique retombait sur des données simulées
        // (mêmes pics horaires chaque jour), et Prophet apprenait alors
        // fidèlement "la même heure est optimale tous les jours" — sur de
        // fausses données, pas sur les vraies publications de la Page.
        $token = $socialAccount->getDecryptedPageAccessToken() ?? $socialAccount->getDecryptedAccessToken();
        if (!$token) {
            return response()->json([
                'success' => false,
                'message' => "Ce compte n'a pas de token d'accès valide. Reconnectez-le depuis les paramètres.",
            ], 400);
        }

        $smAccount = SmAccount::updateOrCreate(
            [
                'user_id'    => $user->id,
                'account_id' => $socialAccount->platform_user_id,
                'platform'   => $socialAccount->platform,
            ],
            [
                'client_id'        => $client->id,
                'account_name'     => $socialAccount->platform_display_name ?: $socialAccount->page_name,
                'account_handle'   => $socialAccount->platform_username,
                'account_type'     => $socialAccount->account_type ?: $socialAccount->platform,
                'access_token'     => $token,
                'ig_user_id'       => $socialAccount->platform_user_id,
                'page_id'          => $socialAccount->page_id,
                'token_expires_at' => $socialAccount->token_expires_at,
                'is_active'        => true,
                'token_valid'      => true,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Compte connecté au client avec succès.',
            'data'    => [
                'id'           => $smAccount->id,
                'platform'     => $smAccount->platform,
                'account_name' => $smAccount->account_name,
                'client_id'    => $smAccount->client_id,
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/social-manager/optimal-slots/{account_id}
    // Créneaux optimaux Prophet (cache + recalcul si nécessaire)
    // ══════════════════════════════════════════════════════════

    public function optimalSlots(Request $request, int $accountId): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $account =  SmAccount::where('user_id', $user->id)->findOrFail($accountId);

        // Vérifie le cache des slots Prophet
        $slots = SmProphetSlot::where('social_account_id', $accountId)
            ->where('slot_datetime', '>', now())
            ->where('is_used', false)
            ->orderBy('slot_datetime')
            ->take(7)
            ->get();

        if ($slots->count() >= 3) {
            return response()->json([
                'success' => true,
                'data'    => [
                    'slots'  => $slots->map(fn($s) => [
                        'id'              => $s->id,
                        'datetime'        => $s->slot_datetime,
                        'predicted_score' => $s->predicted_score,
                        'lower_bound'     => $s->lower_bound,
                        'upper_bound'     => $s->upper_bound,
                    ]),
                    'source'     => 'cached',
                    'best_days'  => [],
                    'best_hours' => [],
                ],
            ]);
        }

        // Recalcul via AI Engine (Prophet)
        try {
            $response = Http::timeout(300)->post(
                "{$this->aiEngineUrl}/social-manager/optimal-slots",
                [
                    'page_access_token' => $account->getDecryptedAccessToken(),
                    'page_id'           => $account->account_id,
                    'ig_user_id'        => $account->ig_user_id,
                    'days_back'         => 90,
                    'forecast_days'     => 7,
                ]
            );

            if ($response->failed()) {
                return response()->json(['success' => false, 'message' => 'AI Engine indisponible'], 503);
            }

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Impossible de joindre l\'AI Engine'], 503);
        }

        $data = $response->json();

        // Stocker les nouveaux slots en cache
        SmProphetSlot::where('social_account_id', $accountId)
            ->where('slot_datetime', '>', now())
            ->delete();

        foreach ($data['optimal_slots'] ?? [] as $slot) {
            SmProphetSlot::create([
                'social_account_id' => $accountId,
                'slot_datetime'     => $slot['datetime'],
                'predicted_score'   => $slot['predicted_engagement'],
                'lower_bound'       => $slot['lower_bound'],
                'upper_bound'       => $slot['upper_bound'],
            ]);
        }

        AgentActivityLog::create([
            'user_id'    => $user->id,
            'agent_slug' => 'social-manager',
            'agent_name' => 'Agent Gestionnaire de RS',
            'action'     => 'prophet_slots_calculated',
            'description'=> "Créneaux optimaux calculés via Prophet + Meta Graph API — " . $account->account_name,
            'status'     => 'success',
            'metadata'   => [
                'data_points'   => $data['data_points'] ?? 0,
                'model_trained' => $data['model_trained'] ?? false,
                'best_days'     => $data['best_days'] ?? [],
                'best_hours'    => $data['best_hours'] ?? [],
            ],
        ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'slots'       => $data['optimal_slots'] ?? [],
                'best_days'   => $data['best_days']    ?? [],
                'best_hours'  => $data['best_hours']   ?? [],
                'data_points' => $data['data_points']  ?? 0,
                'model_trained'=> $data['model_trained'] ?? false,
                'source'      => 'prophet',
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/social-manager/inbox
    // Inbox commentaires (triés par priorité)
    // ══════════════════════════════════════════════════════════

    public function inbox(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user  = $request->user();
        $query = SmCommentInbox::where('user_id', $user->id)
            ->with('socialAccount:id,account_name,platform')
            ->orderByRaw("FIELD(priority, 'high', 'medium', 'low')")
            ->orderByDesc('meta_created_at');

        if ($status = $request->input('status')) {
            $query->where('reply_status', $status);
        }
        if ($sentiment = $request->input('sentiment')) {
            $query->where('sentiment_label', $sentiment);
        }

        $comments = $query->take(50)->get()->map(fn($c) => [
            'id'               => $c->id,
            'commenter_name'   => $c->commenter_name,
            'message'          => $c->message,
            'sentiment_label'  => $c->sentiment_label,
            'sentiment_score'  => $c->sentiment_score,
            'priority'         => $c->priority,
            'suggested_action' => $c->suggested_action,
            'ai_reply_draft'   => $c->ai_reply_draft,
            'final_reply'      => $c->final_reply,
            'reply_status'     => $c->reply_status,
            'is_read'          => $c->is_read,
            'account_name'     => $c->socialAccount?->account_name,
            'platform'         => $c->socialAccount?->platform,
            'created_at'       => $c->meta_created_at?->toIso8601String(),
            'created_ago'      => $c->meta_created_at?->diffForHumans(),
        ]);

        // Marquer comme lu
        SmCommentInbox::where('user_id', $user->id)
            ->where('is_read', false)
            ->whereIn('id', $comments->pluck('id'))
            ->update(['is_read' => true]);

        $stats = [
            'total'     => SmCommentInbox::where('user_id', $user->id)->count(),
            'pending'   => SmCommentInbox::where('user_id', $user->id)->where('reply_status', 'pending')->count(),
            'negative'  => SmCommentInbox::where('user_id', $user->id)->where('sentiment_label', 'NEGATIVE')->where('reply_status', 'pending')->count(),
            'unread'    => SmCommentInbox::where('user_id', $user->id)->where('is_read', false)->count(),
        ];

        return response()->json([
            'success' => true,
            'data'    => ['comments' => $comments, 'stats' => $stats],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/social-manager/comments/{id}/generate-reply
    // Génère une réponse IA avec Mistral 7B
    // ══════════════════════════════════════════════════════════

    public function generateReply(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $comment = SmCommentInbox::where('user_id', $user->id)
            ->with('socialAccount')
            ->findOrFail($id);

        // Récupère le profil client pour le ton de marque
        $profile    = $user->professionalProfile;
        $niche      = $profile?->niches[0]  ?? 'business';
        $brandVoice = $profile ? "professionnel et chaleureux — niche : {$niche}" : "professionnel et chaleureux";

        try {
            $response = Http::timeout(120)->post(
                "{$this->aiEngineUrl}/social-manager/generate-reply",
                [
                    'comment_text'    => $comment->message,
                    'sentiment_label' => $comment->sentiment_label ?? 'NEUTRAL',
                    'post_content'    => $comment->post_content   ?? '',
                    'brand_name'      => $comment->socialAccount?->account_name ?? 'Notre marque',
                    'brand_voice'     => $brandVoice,
                    'language'        => 'Français',
                ]
            );

            if ($response->failed()) {
                return response()->json(['success' => false, 'message' => 'Erreur AI Engine'], 500);
            }

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 503);
        }

        $data  = $response->json();
        $reply = $data['reply_text'] ?? '';

        $comment->update([
            'ai_reply_draft' => $reply,
            'reply_status'   => 'draft',
        ]);

        AgentActivityLog::create([
            'user_id'    => $user->id,
            'agent_slug' => 'social-manager',
            'agent_name' => 'Agent Gestionnaire de RS',
            'action'     => 'reply_generated',
            'description'=> "Réponse Mistral 7B générée — commentaire {$comment->sentiment_label} de {$comment->commenter_name}",
            'status'     => 'success',
            'metadata'   => ['sentiment' => $comment->sentiment_label, 'word_count' => $data['word_count'] ?? 0],
        ]);

        return response()->json([
            'success'     => true,
            'message'     => '✅ Réponse générée — approbation requise avant publication.',
            'data'        => ['reply_draft' => $reply, 'word_count' => $data['word_count'] ?? 0],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/social-manager/comments/{id}/approve
    // Approuve la réponse et la publie via Meta Graph API
    // ══════════════════════════════════════════════════════════

    public function approveReply(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'reply_text' => 'required|string|max:500',
        ]);

        /** @var \App\Models\User $user */
        $user    = $request->user();
        $comment = SmCommentInbox::where('user_id', $user->id)
            ->with('socialAccount')
            ->findOrFail($id);

        $replyText = $request->reply_text;
        $account   = $comment->socialAccount;

        // /social-manager/publish poste sur {page_id}/feed (nouveau post de
        // Page) — pas une réponse au commentateur. reply-comment appelle le
        // vrai edge d'écriture {comment-id}/comments (cf. ReplyController).
        // SmAccount n'a qu'un seul champ access_token (pas de token séparé
        // pour la Page) — connect() y stocke déjà le Page token directement.
        $token = $account->getDecryptedAccessToken();

        $published = false;
        $errorMessage = null;
        try {
            $response = Http::timeout(30)->post(
                "{$this->aiEngineUrl}/social-manager/reply-comment",
                [
                    'page_access_token' => $token,
                    'comment_id'        => $comment->comment_id,
                    'message'           => $replyText,
                ]
            );
            $published = $response->successful() && ($response->json('reply_id') !== null);
            if (! $published) {
                $errorMessage = $response->json('detail') ?? $response->body();
            }
        } catch (\Exception $e) {
            $errorMessage = $e->getMessage();
        }

        if (! $published) {
            Log::warning("ApproveReply: échec publication Meta — {$errorMessage}");
        }

        // 'approved' : réponse validée par l'humain mais pas encore publiée
        // avec succès — distinct de 'published', pour ne jamais afficher une
        // réponse comme envoyée au client alors qu'elle ne l'est pas (règle 13).
        $comment->update([
            'final_reply'  => $replyText,
            'reply_status' => $published ? 'published' : 'approved',
            'is_read'      => true,
        ]);

        AgentActivityLog::create([
            'user_id'    => $user->id,
            'agent_slug' => 'social-manager',
            'agent_name' => 'Agent Gestionnaire de RS',
            'action'     => $published ? 'reply_approved_published' : 'reply_approved_publish_failed',
            'description'=> $published
                ? "Réponse approuvée et publiée — {$comment->commenter_name}"
                : "Réponse approuvée mais échec de publication Meta — {$comment->commenter_name} ({$errorMessage})",
            'status'     => $published ? 'success' : 'error',
        ]);

        if (! $published) {
            return response()->json([
                'success' => false,
                'message' => "⚠️ Réponse enregistrée mais la publication sur Meta a échoué : {$errorMessage}",
            ], 502);
        }

        return response()->json([
            'success' => true,
            'message' => '✅ Réponse approuvée et publiée via Meta Graph API !',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/agents/social-manager/queue
    // Ajoute une publication en file d'attente avec créneau Prophet
    // ══════════════════════════════════════════════════════════

    public function addToQueue(Request $request): JsonResponse
    {
        $request->validate([
            'social_account_id' => 'required|integer|exists:sm_accounts,id',
            'message'           => 'required|string|max:63206',
            'image_url'         => 'nullable|url',
            'link_url'          => 'nullable|url',
            'scheduled_at'      => 'nullable|date|after:now',
        ]);

        /** @var \App\Models\User $user */
        $user    = $request->user();
        $account = SmAccount::where('user_id', $user->id)
            ->findOrFail($request->social_account_id);

        // Si pas d'heure spécifiée → Prophet choisit le prochain créneau libre
        $scheduledAt  = $request->scheduled_at;
        $prophetScore = null;

        if (!$scheduledAt) {
            $nextSlot = SmProphetSlot::where('social_account_id', $account->id)
                ->where('slot_datetime', '>', now())
                ->where('is_used', false)
                ->orderBy('slot_datetime')
                ->first();

            if ($nextSlot) {
                $scheduledAt  = $nextSlot->slot_datetime;
                $prophetScore = $nextSlot->predicted_score;
                $nextSlot->update(['is_used' => true]);
            } else {
                $scheduledAt = now()->addHour();
            }
        }

        $item = SmContentQueue::create([
            'user_id'           => $user->id,
            'social_account_id' => $account->id,
            'message'           => $request->message,
            'image_url'         => $request->image_url,
            'link_url'          => $request->link_url,
            'scheduled_at'      => $scheduledAt,
            'prophet_slot_score'=> $prophetScore,
            'status'            => 'scheduled',
        ]);

        AgentActivityLog::create([
            'user_id'    => $user->id,
            'agent_slug' => 'social-manager',
            'agent_name' => 'Agent Gestionnaire de RS',
            'action'     => 'post_queued',
            'description'=> "Publication ajoutée à la file — {$account->account_name} · Créneau : {$scheduledAt}",
            'status'     => 'success',
            'metadata'   => ['prophet_score' => $prophetScore, 'scheduled_at' => $scheduledAt],
        ]);

        return response()->json([
            'success' => true,
            'message' => '✅ Publication ajoutée à la file d\'attente.',
            'data'    => [
                'item'         => $item,
                'scheduled_at' => $scheduledAt,
                'prophet_score'=> $prophetScore,
            ],
        ], 201);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/social-manager/queue
    // File d'attente des publications
    // ══════════════════════════════════════════════════════════

    public function queue(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user  = $request->user();
        $items = SmContentQueue::where('user_id', $user->id)
            ->with('socialAccount:id,account_name,platform')
            ->where('scheduled_at', '>', now()->subDays(7))
            ->orderBy('scheduled_at')
            ->take(50)
            ->get()
            ->map(fn($q) => [
                'id'           => $q->id,
                'message'      => $q->message,
                'has_image'    => !empty($q->image_url),
                'image_url'    => $q->image_url,
                'scheduled_at' => $q->scheduled_at?->toIso8601String(),
                'score'        => $q->prophet_slot_score,
                'status'       => $q->status,
                'meta_post_id' => $q->meta_post_id,
                'account_name' => $q->socialAccount?->account_name,
                'platform'     => $q->socialAccount?->platform,
            ]);

        return response()->json([
            'success' => true,
            'data'    => ['queue' => $items],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // DELETE /api/professional/agents/social-manager/queue/{id}
    // ══════════════════════════════════════════════════════════

    public function removeFromQueue(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        SmContentQueue::where('user_id', $user->id)
            ->where('status', 'scheduled')
            ->findOrFail($id)
            ->delete();

        return response()->json(['success' => true, 'message' => 'Publication supprimée.']);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/agents/social-manager/metrics/{account_id}
    // Métriques temps réel de la Page
    // ══════════════════════════════════════════════════════════

    public function metrics(Request $request, int $accountId): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $account = SmAccount::where('user_id', $user->id)->findOrFail($accountId);

        // Récupère les métriques en base (enregistrées par le scheduler)
        $metrics = SmEngagementMetric::where('social_account_id', $accountId)
            ->where('recorded_at', '>=', now()->subDays(7))
            ->orderByDesc('recorded_at')
            ->get()
            ->groupBy('metric_type')
            ->map(fn($group) => $group->map(fn($m) => [
                'value'       => $m->value,
                'recorded_at' => $m->recorded_at->toIso8601String(),
            ])->toArray());

        // Stats inbox
        $inboxStats = [
            'total'    => SmCommentInbox::where('user_id', $user->id)->where('social_account_id', $accountId)->count(),
            'pending'  => SmCommentInbox::where('user_id', $user->id)->where('social_account_id', $accountId)->where('reply_status', 'pending')->count(),
            'negative' => SmCommentInbox::where('user_id', $user->id)->where('social_account_id', $accountId)->where('sentiment_label', 'NEGATIVE')->where('reply_status', 'pending')->count(),
        ];

        return response()->json([
            'success' => true,
            'data'    => [
                'metrics'     => $metrics,
                'inbox_stats' => $inboxStats,
                'account'     => ['name' => $account->account_name, 'platform' => $account->platform],
            ],
        ]);
    }
}