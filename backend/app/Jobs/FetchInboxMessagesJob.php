<?php

namespace App\Jobs;

use App\Models\AutoReplyConfig;
use App\Models\InboxMessage;
use App\Models\SocialAccount;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FetchInboxMessagesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120;
    public int $tries   = 2;

    public function __construct(
        public readonly SocialAccount $account,
    ) {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        Log::info("FetchInboxMessagesJob — compte #{$this->account->id} ({$this->account->platform})");

        // Token de Page en priorité : Meta exige désormais un token de Page
        // (pas le token utilisateur) pour lire les posts/commentaires d'une
        // Page ou d'un compte IG Business qui y est lié — même contrainte
        // que SchedulerService::runAnalysisNow(), confirmée en direct ici
        // aussi ("Un token d'accès de Page est requis pour cet appel dans
        // la nouvelle version des Pages"), qui faisait échouer CHAQUE
        // "Actualiser" silencieusement (0 message récupéré, aucune erreur
        // visible côté utilisateur).
        $token = $this->account->getDecryptedPageAccessToken() ?? $this->account->getDecryptedAccessToken();
        if (!$token) {
            Log::warning("Token invalide pour compte #{$this->account->id}");
            return;
        }

        $newMessages = match($this->account->platform) {
            'instagram' => $this->fetchInstagramComments($token),
            'facebook'  => $this->fetchFacebookComments($token),
            'tiktok'    => [], // TikTok nécessite scope spécial
            default     => [],
        };

        $created = 0;
        foreach ($newMessages as $msg) {
            try {
                // Évite les doublons via platform_message_id
                $exists = InboxMessage::where('platform_message_id', $msg['platform_message_id'])->exists();
                if ($exists) continue;

                $inbox = InboxMessage::create(array_merge($msg, [
                    'user_id'           => $this->account->user_id,
                    'social_account_id' => $this->account->id,
                    'status'            => 'new',
                ]));

                // Dispatch pour traitement IA
                ProcessMessageJob::dispatch($inbox)->onQueue('default');
                $created++;

            } catch (\Exception $e) {
                Log::error("FetchInboxMessagesJob create erreur: " . $e->getMessage());
            }
        }

        Log::info("FetchInboxMessagesJob terminé — {$created} nouveaux messages créés");

        // Met à jour la date de sync
        $this->account->update(['last_synced_at' => now()]);
    }

    // ── Commentaires Instagram ─────────────────────────────────
    private function fetchInstagramComments(string $token): array
    {
        $graphBase = 'https://graph.facebook.com/' . config('services.meta.graph_version', 'v21.0');
        $igUserId  = $this->account->platform_user_id;
        $messages  = [];

        try {
            // Timeout explicite sur chaque appel Graph API : sans ->timeout(),
            // le client HTTP de Laravel n'a AUCUNE limite, et jusqu'à 11 appels
            // séquentiels (1 média + 10 commentaires) peuvent s'enchaîner par
            // compte — un seul appel qui traîne suffit à bloquer ce job (et
            // donc la queue 'default' partagée avec les autres agents) pendant
            // plusieurs minutes, ce qui donnait l'impression que "Actualiser"
            // ne se terminait jamais côté utilisateur.
            $mediaResp = Http::timeout(15)->get("{$graphBase}/{$igUserId}/media", [
                'fields'       => 'id,caption,timestamp',
                'limit'        => 10,
                'access_token' => $token,
            ]);

            if (!$mediaResp->successful()) return [];

            foreach ($mediaResp->json()['data'] ?? [] as $media) {
                // Commentaires de chaque post
                $commResp = Http::timeout(15)->get("{$graphBase}/{$media['id']}/comments", [
                    'fields'       => 'id,text,username,from,timestamp',
                    'limit'        => 20,
                    'access_token' => $token,
                ]);

                if (!$commResp->successful()) continue;

                foreach ($commResp->json()['data'] ?? [] as $comment) {
                    // Ne récupère que les commentaires récents (dernières 24h)
                    $commentTime = \Carbon\Carbon::parse($comment['timestamp'] ?? now());
                    if ($commentTime->lt(now()->subHours(24))) continue;

                    $messages[] = [
                        'message_type'       => 'comment',
                        'platform_message_id'=> $comment['id'],
                        'platform'           => 'instagram',
                        'text'               => $comment['text'] ?? '',
                        'author_id'          => $comment['from']['id'] ?? null,
                        'author_name'        => $comment['username'] ?? $comment['from']['name'] ?? null,
                        'post_id'            => $media['id'],
                        'post_caption'       => $media['caption'] ?? null,
                        'platform_created_at'=> $commentTime,
                    ];
                }
            }

        } catch (\Exception $e) {
            Log::error("fetchInstagramComments erreur: " . $e->getMessage());
        }

        return $messages;
    }

    // ── Commentaires Facebook Page ─────────────────────────────
    private function fetchFacebookComments(string $token): array
    {
        $graphBase = 'https://graph.facebook.com/' . config('services.meta.graph_version', 'v21.0');
        $pageId    = $this->account->page_id;
        $messages  = [];

        if (!$pageId) return [];

        try {
            $postsResp = Http::timeout(15)->get("{$graphBase}/{$pageId}/posts", [
                'fields'       => 'id,message,created_time',
                'limit'        => 10,
                'access_token' => $token,
            ]);

            if (!$postsResp->successful()) return [];

            foreach ($postsResp->json()['data'] ?? [] as $post) {
                $commResp = Http::timeout(15)->get("{$graphBase}/{$post['id']}/comments", [
                    'fields'       => 'id,message,from,created_time',
                    'limit'        => 20,
                    'access_token' => $token,
                ]);

                if (!$commResp->successful()) continue;

                foreach ($commResp->json()['data'] ?? [] as $comment) {
                    $commentTime = \Carbon\Carbon::parse($comment['created_time'] ?? now());
                    if ($commentTime->lt(now()->subHours(24))) continue;

                    $messages[] = [
                        'message_type'       => 'comment',
                        'platform_message_id'=> $comment['id'],
                        'platform'           => 'facebook',
                        'text'               => $comment['message'] ?? '',
                        'author_id'          => $comment['from']['id'] ?? null,
                        'author_name'        => $comment['from']['name'] ?? null,
                        'post_id'            => $post['id'],
                        'post_caption'       => $post['message'] ?? null,
                        'platform_created_at'=> $commentTime,
                    ];
                }
            }

        } catch (\Exception $e) {
            Log::error("fetchFacebookComments erreur: " . $e->getMessage());
        }

        return $messages;
    }

    public function failed(\Throwable $e): void
    {
        Log::error("FetchInboxMessagesJob failed #{$this->account->id}: " . $e->getMessage());
    }
}