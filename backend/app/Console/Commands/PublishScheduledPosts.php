<?php

namespace App\Console\Commands;

use App\Models\AgentActivityLog;
use App\Models\SmContentQueue;
use App\Models\SmProphetSlot;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PublishScheduledPosts extends Command
{
    protected $signature   = 'social:publish-scheduled';
    protected $description = 'Publie les posts programmés via Meta Graph API (toutes les minutes)';

    public function handle(): void
    {
        $posts = SmContentQueue::where('status', 'scheduled')
            ->where('scheduled_at', '<=', now())
            ->with('socialAccount')
            ->get();

        foreach ($posts as $post) {
            try {
                $account  = $post->socialAccount;
                $response = Http::timeout(30)->post(
                    config('services.ai_engine.url') . '/social-manager/publish',
                    [
                        'page_access_token' => $account->getDecryptedAccessToken(),
                        'page_id'           => $account->account_id,
                        'message'           => $post->message,
                        'image_url'         => $post->image_url,
                        'link'              => $post->link_url,
                    ]
                );

                if ($response->successful() && isset($response->json()['post_id'])) {
                    $post->update([
                        'status'       => 'published',
                        'meta_post_id' => $response->json()['post_id'],
                    ]);

                    // Marquer le slot Prophet comme utilisé
                    SmProphetSlot::where('social_account_id', $post->social_account_id)
                        ->where('slot_datetime', $post->scheduled_at)
                        ->update(['is_used' => true]);

                    AgentActivityLog::create([
                        'user_id'     => $post->user_id,
                        'agent_slug'  => 'social-manager',
                        'agent_name'  => 'Agent Gestionnaire de RS',
                        'action'      => 'post_published',
                        'description' => "Post publié via Meta Graph API — " . $account->account_name,
                        'status'      => 'success',
                        'metadata'    => ['post_id' => $response->json()['post_id'], 'platform' => $account->platform],
                    ]);
                } else {
                    $post->update([
                        'status'        => 'failed',
                        'error_message' => $response->body(),
                    ]);
                }

            } catch (\Exception $e) {
                Log::error("PublishScheduled erreur post #{$post->id}: " . $e->getMessage());
                $post->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
            }
        }
    }
}