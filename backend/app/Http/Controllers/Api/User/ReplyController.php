<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Models\InboxMessage;
use App\Models\AutoReplyConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ReplyController extends Controller
{
    private string $aiEngineUrl;
    private string $graphBase;

    public function __construct()
    {
        $this->aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');
        $this->graphBase   = 'https://graph.facebook.com/' . config('services.meta.graph_version', 'v21.0');
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/inbox/{id}/approve — Approuver + Publier
    // ══════════════════════════════════════════════════════════

    public function approve(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'reply_text' => 'required|string|max:2000',
        ]);

        /** @var \App\Models\User $user */
        $user    = $request->user();
        $message = InboxMessage::where('user_id', $user->id)->findOrFail($id);

        try {
            $result = $this->publishReply($message, $request->reply_text);

            $message->update([
                'final_reply' => $request->reply_text,
                'status'      => 'published',
                'replied_at'  => now(),
                'is_read'     => true,
            ]);

            Log::info("Réponse publiée pour message #{$id}", [
                'user_id'  => $user->id,
                'platform' => $message->platform,
            ]);

            return response()->json([
                'success' => true,
                'message' => '✅ Réponse publiée avec succès !',
                'data'    => ['result' => $result],
            ]);

        } catch (\Exception $e) {
            Log::error("Échec publication réponse #{$id}", ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Échec : ' . $e->getMessage(),
            ], 500);
        }
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/inbox/{id}/reject
    // ══════════════════════════════════════════════════════════

    public function reject(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $message = InboxMessage::where('user_id', $user->id)->findOrFail($id);
        $message->update(['status' => 'rejected', 'is_read' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Réponse rejetée.',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/inbox/{id}/flag
    // ══════════════════════════════════════════════════════════

    public function flag(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $message = InboxMessage::where('user_id', $user->id)->findOrFail($id);
        $message->update(['status' => 'flagged', 'is_read' => true]);

        return response()->json([
            'success' => true,
            'message' => '🚩 Signalé pour revue humaine.',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/inbox/{id}/regenerate — Régénérer la réponse IA
    // ══════════════════════════════════════════════════════════

    public function regenerate(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $message = InboxMessage::where('user_id', $user->id)->findOrFail($id);
        $config  = AutoReplyConfig::where('user_id', $user->id)
            ->where('social_account_id', $message->social_account_id)
            ->first();

        try {
            $aiResponse = Http::timeout(180)->post(
                "{$this->aiEngineUrl}/auto-reply/generate-reply",
                [
                    'message_text'   => $message->text,
                    'message_type'   => $message->message_type,
                    'sentiment'      => $message->sentiment ?? 'neutral',
                    'platform'       => $message->platform,
                    'brand_name'     => $config?->brand_name ?? 'Notre marque',
                    'brand_examples' => $config?->getValidBrandExamples() ?? [],
                    'post_context'   => $message->post_caption ?? '',
                    'author_name'    => $message->author_name ?? '',
                ]
            );

            if ($aiResponse->failed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur AI Engine.',
                ], 500);
            }

            $data = $aiResponse->json();

            $message->update([
                'ai_reply'          => $data['response_text'],
                'brand_voice_score' => $data['brand_voice_score'] ?? null,
                'status'            => 'pending_approval',
            ]);

            return response()->json([
                'success'  => true,
                'message'  => '✅ Nouvelle réponse générée.',
                'data'     => ['ai_reply' => $data['response_text']],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la régénération.',
            ], 500);
        }
    }

    // ══════════════════════════════════════════════════════════
    // Publication directe via API plateforme
    // ══════════════════════════════════════════════════════════

    public function publishReply(InboxMessage $message, string $replyText): array
    {
        $account = $message->socialAccount;
        if (!$account) {
            throw new \Exception('Compte social introuvable.');
        }

        // Meta exige le token de PAGE (pas le token utilisateur) pour
        // publier un commentaire ou un message Messenger — confirmé en
        // direct : "(#3) Publishing comments through the API is only
        // available for page access tokens". TikTok reste sur le token
        // utilisateur classique (pas de notion de Page côté TikTok).
        $token = in_array($account->platform, ['instagram', 'facebook'], true)
            ? ($account->getDecryptedPageAccessToken() ?? $account->getDecryptedAccessToken())
            : $account->getDecryptedAccessToken();

        if (!$token) {
            throw new \Exception('Token invalide. Reconnectez le compte.');
        }

        $msgId = $message->platform_message_id;

        return match($account->platform) {
            'instagram', 'facebook' => match($message->message_type) {
                'comment' => $this->replyToMetaComment($msgId, $replyText, $token),
                'dm'      => $this->replyToMetaDM($replyText, $token, $message->author_id),
                default   => ['success' => false, 'reason' => 'unknown_type'],
            },
            'tiktok' => $this->replyToTikTokComment(
                $msgId, $replyText, $token, $message->post_id
            ),
            default => ['success' => false, 'reason' => 'platform_not_supported'],
        };
    }

    // ── Réponse commentaire Meta (Instagram/Facebook) ─────────
    private function replyToMetaComment(string $commentId, string $text, string $token): array
    {
        // /{comment-id}/comments crée une réponse (édge d'écriture) —
        // /{comment-id}/replies est l'édge de LECTURE des réponses
        // existantes ; y POSTer échoue avec "does not exist, cannot be
        // loaded due to missing permissions, or does not support this
        // operation" (confirmé en direct contre un vrai commentaire).
        $resp = Http::post(
            "{$this->graphBase}/{$commentId}/comments",
            ['message' => $text, 'access_token' => $token]
        );

        if (!$resp->successful()) {
            throw new \Exception('Meta API erreur : ' . $resp->body());
        }

        return ['success' => true, 'platform_id' => $resp->json()['id'] ?? null];
    }

    // ── Réponse DM Meta (Facebook Messenger / Instagram DM) ────
    private function replyToMetaDM(string $text, string $token, ?string $authorId): array
    {
        if (!$authorId) {
            throw new \Exception('ID auteur manquant pour le DM.');
        }

        $resp = Http::post("{$this->graphBase}/me/messages", [
            'recipient'    => ['id' => $authorId],
            'message'      => ['text' => $text],
            'access_token' => $token,
        ]);

        if (!$resp->successful()) {
            throw new \Exception('Meta DM erreur : ' . $resp->body());
        }

        return ['success' => true];
    }

    // ── Réponse commentaire TikTok ────────────────────────────
    private function replyToTikTokComment(
        string  $commentId,
        string  $text,
        string  $token,
        ?string $videoId
    ): array {
        if (!$videoId) {
            throw new \Exception('Video ID manquant pour TikTok.');
        }

        $resp = Http::withToken($token)
            ->post('https://open.tiktokapis.com/v2/video/comment/reply/', [
                'video_id'          => $videoId,
                'parent_comment_id' => $commentId,
                'text'              => $text,
            ]);

        if (!$resp->successful()) {
            throw new \Exception('TikTok API erreur : ' . $resp->body());
        }

        return ['success' => true];
    }
}