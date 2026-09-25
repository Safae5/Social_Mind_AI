<?php

namespace App\Jobs;

use App\Models\AutoReplyConfig;
use App\Models\InboxMessage;
use App\Http\Controllers\Api\User\ReplyController;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProcessMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 180;
    public int $tries   = 2;

    public function __construct(
        public readonly InboxMessage $message,
    ) {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        $aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');

        // Récupère la config d'auto-réponse du compte
        $config = AutoReplyConfig::where('user_id', $this->message->user_id)
            ->where('social_account_id', $this->message->social_account_id)
            ->first();

        try {
            // ── Appel pipeline complet IA ─────────────────────
            $aiResponse = Http::timeout(180)->post(
                "{$aiEngineUrl}/auto-reply/pipeline",
                [
                    'message_text'   => $this->message->text,
                    'message_type'   => $this->message->message_type,
                    'platform'       => $this->message->platform,
                    'brand_name'     => $config?->brand_name ?? 'Notre marque',
                    'brand_examples' => $config?->getValidBrandExamples() ?? [],
                    'post_context'   => $this->message->post_caption ?? '',
                    'author_name'    => $this->message->author_name ?? '',
                ]
            );

            if ($aiResponse->failed()) {
                Log::error("ProcessMessageJob AI Engine failed #{$this->message->id}");
                $this->message->update(['status' => 'classified']);
                return;
            }

            $data           = $aiResponse->json();
            $classification = $data['classification'] ?? [];
            $spam_info      = $data['spam_info'] ?? [];
            $reply          = $data['reply'] ?? [];
            $action         = $data['action'] ?? 'pending_approval';

            // ── Données de base ───────────────────────────────
            $updateData = [
                'sentiment'            => $classification['sentiment'] ?? 'neutral',
                'sentiment_confidence' => $classification['confidence'] ?? null,
                'toxicity_score'       => $spam_info['toxicity_score'] ?? null,
                'ai_reply'             => $reply['response_text'] ?? null,
                'brand_voice_score'    => $data['brand_voice_score'] ?? null,
                'status'               => 'classified',
            ];

            // ── Détermine le statut final selon l'action ───────
            switch ($action) {
                case 'hide':
                    // Spam → masquer automatiquement
                    $updateData['status'] = 'hidden';
                    if ($config?->auto_hide_spam) {
                        $this->hideMessageOnPlatform();
                    }
                    break;

                case 'auto_reply':
                    // Positif ou question avec auto-réponse activée
                    $canAutoReply = (
                        ($classification['sentiment'] === 'positive' && $config?->auto_reply_positive) ||
                        ($classification['sentiment'] === 'question' && $config?->auto_reply_questions)
                    );

                    if ($canAutoReply && $reply['response_text']) {
                        try {
                            $replyCtrl = new ReplyController();
                            $this->message->update($updateData);
                            $replyCtrl->publishReply($this->message, $reply['response_text']);
                            $updateData['status']       = 'auto_replied';
                            $updateData['final_reply']  = $reply['response_text'];
                            $updateData['replied_at']   = now();
                        } catch (\Exception $e) {
                            Log::error("Auto-reply publication failed: " . $e->getMessage());
                            $updateData['status'] = 'pending_approval';
                        }
                    } else {
                        $updateData['status'] = 'pending_approval';
                    }
                    break;

                case 'flag_review':
                    $updateData['status'] = 'flagged';
                    break;

                default:
                    $updateData['status'] = 'pending_approval';
            }

            $this->message->update($updateData);
            Log::info("ProcessMessageJob terminé #{$this->message->id} → status: {$updateData['status']}");

        } catch (\Exception $e) {
            Log::error("ProcessMessageJob erreur #{$this->message->id}: " . $e->getMessage());
            $this->message->update(['status' => 'classified']);
        }
    }

    // ── Masquage du message sur la plateforme ─────────────────
    private function hideMessageOnPlatform(): void
    {
        $account = $this->message->socialAccount;
        if (!$account) return;

        // Token de Page requis pour modérer un commentaire — même
        // contrainte Meta que ReplyController::publishReply().
        $token = $account->getDecryptedPageAccessToken() ?? $account->getDecryptedAccessToken();
        $msgId = $this->message->platform_message_id;

        if (in_array($account->platform, ['instagram', 'facebook'])) {
            Http::post(
                "https://graph.facebook.com/" . config('services.meta.graph_version', 'v21.0') . "/{$msgId}",
                ['is_hidden' => 'true', 'access_token' => $token]
            );
        }
    }

    public function failed(\Throwable $e): void
    {
        Log::error("ProcessMessageJob failed #{$this->message->id}: " . $e->getMessage());
        $this->message->update(['status' => 'classified']);
    }
}