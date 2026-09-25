<?php

namespace App\Console\Commands;

use App\Models\SmCommentInbox;
use App\Models\SmAccount;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PollSocialComments extends Command
{
    protected $signature   = 'social:poll-comments';
    protected $description = 'Polling commentaires Meta Graph API (toutes les 15 min)';

    public function handle(): void
    {
        $accounts = SmAccount::where('platform', 'facebook')
            ->active()
            ->get();

        $this->info("Polling commentaires — {$accounts->count()} comptes actifs");

        foreach ($accounts as $account) {
            try {
                $lastCheck = SmCommentInbox::where('social_account_id', $account->id)
                    ->max('meta_created_at');
                // Pas de watermark au premier poll d'un compte (ou après une
                // longue interruption) : '-15 minutes' filtrait alors TOUT
                // via le paramètre "since" de Meta dès que les commentaires
                // dataient de plus de 15 min — ce qui est le cas dès que la
                // commande n'a jamais tourné avant. Aligné sur la fenêtre de
                // 7 jours que get_recent_comments() utilise déjà côté AI
                // engine pour choisir quels posts inspecter.
                $since = $lastCheck ? strtotime($lastCheck) : strtotime('-7 days');

                $response = Http::timeout(60)->post(
                    config('services.ai_engine.url') . '/social-manager/poll-comments',
                    [
                        'page_access_token' => $account->getDecryptedAccessToken(),
                        'page_id'           => $account->account_id,
                        'since_timestamp'   => $since,
                    ]
                );

                if ($response->failed()) {
                    Log::error("PollComments: compte #{$account->id} erreur");
                    continue;
                }

                $comments = $response->json()['comments'] ?? [];
                $new      = 0;

                foreach ($comments as $comment) {
                    if (SmCommentInbox::where('comment_id', $comment['id'])->exists()) {
                        continue;
                    }

                    $sentiment = $comment['sentiment'] ?? [];
                    SmCommentInbox::create([
                        'user_id'           => $account->user_id,
                        'social_account_id' => $account->id,
                        'comment_id'        => $comment['id'],
                        'post_id'           => $comment['post_id'] ?? '',
                        'commenter_name'    => $comment['from']['name'] ?? 'Utilisateur',
                        'commenter_id'      => $comment['from']['id']  ?? null,
                        'message'           => $comment['message']      ?? '',
                        'sentiment_label'   => $sentiment['label']     ?? 'NEUTRAL',
                        'sentiment_score'   => $sentiment['score']     ?? 0,
                        'priority'          => $sentiment['priority']  ?? 'medium',
                        'suggested_action'  => $sentiment['suggested_action'] ?? 'review',
                        'meta_created_at'   => $comment['created_time'] ?? now(),
                        'reply_status'      => 'pending',
                    ]);
                    $new++;
                }

                if ($new > 0) {
                    Log::info("PollComments: {$new} nouveaux commentaires — compte #{$account->id}");
                    // Alerter si commentaires négatifs
                    $negative = SmCommentInbox::where('social_account_id', $account->id)
                        ->where('sentiment_label', 'NEGATIVE')
                        ->where('reply_status', 'pending')
                        ->count();
                    if ($negative > 0) {
                        $account->user->notify(
                            new \App\Notifications\NegativeCommentAlert($negative)
                        );
                    }
                }

            } catch (\Exception $e) {
                Log::error("PollComments erreur compte #{$account->id}: " . $e->getMessage());
            }
        }
        $this->info('✅ Polling terminé');
    }
}