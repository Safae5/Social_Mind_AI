<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Jobs\FetchInboxMessagesJob;
use App\Models\AgentActivityLog;
use App\Models\AutoReplyConfig;
use App\Models\InboxMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InboxController extends Controller
{
    // ══════════════════════════════════════════════════════════
    // GET /api/inbox — Inbox paginée avec filtres
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user  = $request->user();
        $query = InboxMessage::where('user_id', $user->id)
            ->with('socialAccount:id,platform,platform_username,platform_avatar_url')
            ->orderByDesc('platform_created_at');

        // ── Filtres ───────────────────────────────────────────
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->filled('type')) {
            $query->where('message_type', $request->type);
        }
        if ($request->filled('platform')) {
            $query->where('platform', $request->platform);
        }
        if ($request->filled('sentiment')) {
            $query->where('sentiment', $request->sentiment);
        }
        if (!$request->boolean('show_read') && $request->status !== 'all') {
            $query->where('is_read', false);
        }

        $messages = $query->paginate(20)->through(fn($m) => [
            'id'                => $m->id,
            'message_type'      => $m->message_type,
            'platform'          => $m->platform,
            'platform_username' => $m->socialAccount?->platform_username,
            'platform_avatar'   => $m->socialAccount?->platform_avatar_url,
            'text'              => $m->text,
            'author_name'       => $m->author_name,
            'post_caption'      => $m->post_caption
                                    ? substr($m->post_caption, 0, 80) . '...'
                                    : null,
            'sentiment'         => $m->sentiment,
            'sentiment_emoji'   => $m->getSentimentEmoji(),
            'sentiment_confidence' => $m->sentiment_confidence,
            'toxicity_score'    => $m->toxicity_score,
            'status'            => $m->status,
            'ai_reply'          => $m->ai_reply,
            'final_reply'       => $m->final_reply,
            'brand_voice_score' => $m->brand_voice_score,
            'is_read'           => $m->is_read,
            'created_at'        => $m->platform_created_at?->diffForHumans(),
            'created_at_iso'    => $m->platform_created_at?->toIso8601String(),
        ]);

        // ── Stats globales ────────────────────────────────────
        $stats = [
            'total'   => InboxMessage::where('user_id', $user->id)->count(),
            'unread'  => InboxMessage::where('user_id', $user->id)->where('is_read', false)->count(),
            'pending' => InboxMessage::where('user_id', $user->id)->where('status', 'pending_approval')->count(),
            'flagged' => InboxMessage::where('user_id', $user->id)->where('status', 'flagged')->count(),
            'spam'    => InboxMessage::where('user_id', $user->id)->where('status', 'hidden')->count(),
        ];

        return response()->json([
            'success'  => true,
            'messages' => $messages,
            'stats'    => $stats,
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/inbox/refresh — Forcer un rechargement
    // ══════════════════════════════════════════════════════════

    public function refresh(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $accounts = $user->socialAccounts()->active()->get();

        foreach ($accounts as $account) {
            FetchInboxMessagesJob::dispatch($account)->onQueue('default');
        }

        AgentActivityLog::create([
            'user_id'    => $user->id,
            'agent_slug' => 'auto-reply',
            'agent_name' => 'Répondeur Automatique',
            'action'     => 'inbox_refresh',
            'description'=> "Rechargement demandé pour {$accounts->count()} compte(s)",
            'status'     => 'pending',
            'started_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Rechargement lancé pour {$accounts->count()} compte(s).",
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/inbox/{id}/read
    // ══════════════════════════════════════════════════════════

    public function markRead(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $message = InboxMessage::where('user_id', $user->id)->findOrFail($id);
        $message->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Marqué comme lu.',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/inbox/config/{accountId}
    // ══════════════════════════════════════════════════════════

    public function getConfig(Request $request, int $socialAccountId): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user   = $request->user();
        $config = AutoReplyConfig::firstOrCreate(
            ['user_id' => $user->id, 'social_account_id' => $socialAccountId],
            [
                'auto_reply_positive'  => false,
                'auto_reply_questions' => false,
                'auto_hide_spam'       => true,
                'auto_flag_negative'   => true,
                'notify_negative'      => true,
                'notify_new_dm'        => true,
            ]
        );

        return response()->json([
            'success' => true,
            'data'    => ['config' => $config],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // PUT /api/inbox/config/{accountId}
    // ══════════════════════════════════════════════════════════

    public function updateConfig(Request $request, int $socialAccountId): JsonResponse
    {
        $request->validate([
            'auto_reply_positive'  => 'boolean',
            'auto_reply_questions' => 'boolean',
            'auto_hide_spam'       => 'boolean',
            'auto_flag_negative'   => 'boolean',
            'brand_name'           => 'nullable|string|max:100',
            'brand_examples'       => 'nullable|array|max:3',
            'brand_examples.*'     => 'string|max:500',
            'notify_negative'      => 'boolean',
            'notify_new_dm'        => 'boolean',
        ]);

        /** @var \App\Models\User $user */
        $user   = $request->user();
        $config = AutoReplyConfig::updateOrCreate(
            ['user_id' => $user->id, 'social_account_id' => $socialAccountId],
            $request->only([
                'auto_reply_positive', 'auto_reply_questions',
                'auto_hide_spam', 'auto_flag_negative',
                'brand_name', 'brand_examples',
                'notify_negative', 'notify_new_dm',
            ])
        );

        return response()->json([
            'success' => true,
            'message' => '✅ Configuration mise à jour.',
            'data'    => ['config' => $config],
        ]);
    }
}