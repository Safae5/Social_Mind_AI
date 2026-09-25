<?php

namespace App\Jobs;

use App\Events\ScheduledPostPublished;
use App\Models\ScheduledPost;
use App\Services\Social\MetaOAuthService;
use App\Services\Social\TikTokOAuthService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessScheduledPostJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120;
    public int $tries   = 1;

    // ── Remplace la propriété par onQueue() dans le dispatch ──
    // Ne pas déclarer $queue ici — utilise onQueue() à la place

    public function __construct(
        public readonly ScheduledPost $post,
    ) {
        // Définit la queue via la méthode du trait — pas de conflit
        $this->onQueue('publishing');
    }

    public function handle(
        MetaOAuthService   $metaService,
        TikTokOAuthService $tiktokService
    ): void {
        $account = $this->post->socialAccount;

        if (!$account || !$account->token_valid) {
            $this->post->update([
                'status'         => 'failed',
                'failure_reason' => 'Compte social non connecté ou token invalide.',
            ]);
            return;
        }

        $this->post->update(['status' => 'processing']);

        try {
            $result = match($account->platform) {
                'instagram' => $metaService->publishInstagramPost(
                    $account,
                    $this->post->caption,
                    $this->post->media_url,
                    null,
                    strtoupper($this->post->media_type ?? 'IMAGE')
                ),
                'facebook' => $metaService->publishFacebookPost(
                    $account,
                    $this->post->caption,
                    $this->post->media_url
                ),
                'tiktok' => $this->publishTikTok($tiktokService, $account),
                default   => throw new \Exception(
                    "Plateforme non supportée: {$account->platform}"
                ),
            };

            $this->post->update([
                'status'            => 'published',
                'published_at'      => now(),
                'platform_post_id'  => $result['post_id'],
                'platform_post_url' => $result['post_url'] ?? null,
            ]);

            if ($this->post->contentQueue) {
                $this->post->contentQueue->update(['status' => 'published']);
            }

            event(new ScheduledPostPublished($this->post, $result));

            Log::info("Post #{$this->post->id} publié sur {$account->platform}");

        } catch (\Exception $e) {
            Log::error("Publication échouée pour post #{$this->post->id}", [
                'error' => $e->getMessage(),
            ]);

            if ($this->post->shouldRetry()) {
                $this->post->scheduleRetry();

                self::dispatch($this->post)
                    ->onQueue('publishing')
                    ->delay(
                        now()->addMinutes(match((int) $this->post->retry_count) {
                            1       => 15,
                            2       => 60,
                            default => 240,
                        })
                    );
            } else {
                $this->post->update([
                    'status'         => 'failed',
                    'failure_reason' => $e->getMessage(),
                ]);
            }
        }
    }

    private function publishTikTok($tiktokService, $account): array
    {
        if (!$this->post->media_url) {
            throw new \Exception('TikTok nécessite une vidéo.');
        }

        throw new \Exception(
            'Publication TikTok non encore supportée — en attente d\'approbation API.'
        );
    }
}