<?php

namespace App\Jobs;

use App\Models\AgentActivityLog;
use App\Models\AnMetric;
use App\Models\SmAccount;
use App\Models\User;
use App\Services\MetaGraphCollector;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Job de collecte des métriques — dispatché toutes les 6 heures.
 *
 * Flux :
 *   1. Récupère les sm_accounts actifs de l'utilisateur (Agent 2)
 *   2. Appelle MetaGraphCollector (Instagram Business + Facebook Pages)
 *   3. Stocke dans an_metrics (calculatee engagement_rate, engagement_score)
 *   4. Log dans agent_activity_logs
 */
class CollectMetricsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300; // 5 minutes max

    public function __construct(private readonly User $user) {}

    public function handle(MetaGraphCollector $metaCollector): void
    {
        // Récupère les sm_accounts actifs (table Agent 2)
        $accounts = SmAccount::where('user_id', $this->user->id)
            ->active()
            ->get();

        if ($accounts->isEmpty()) {
            Log::info("CollectMetrics : aucun compte sm_accounts actif pour user #{$this->user->id}");
            return;
        }

        $totalCollected = 0;

        foreach ($accounts as $account) {
            try {
                $metrics = [];

                if ($account->platform === 'instagram') {
                    $metrics = $metaCollector->collectInstagramMetrics($account);
                } elseif ($account->platform === 'facebook') {
                    $metrics = $metaCollector->collectFacebookMetrics($account);
                }

                $this->saveMetrics($metrics, $account);
                $totalCollected += count($metrics);

            } catch (\Exception $e) {
                Log::error("CollectMetrics erreur compte #{$account->id}: " . $e->getMessage());
            }
        }

        // Log activité Agent 5
        AgentActivityLog::create([
            'user_id'    => $this->user->id,
            'agent_slug' => 'analytics',
            'agent_name' => 'Agent Analytics IA',
            'action'     => 'metrics_collected',
            'description'=> "Collecte automatique — {$totalCollected} métriques — {$accounts->count()} comptes",
            'status'     => 'success',
            'metadata'   => [
                'total_collected' => $totalCollected,
                'accounts_count'  => $accounts->count(),
                'source'          => 'meta_graph_api_v21',
            ],
            'completed_at' => now(),
        ]);

        Log::info("CollectMetrics user #{$this->user->id} : {$totalCollected} métriques collectées dans an_metrics");
    }

    private function saveMetrics(array $metrics, SmAccount $account): void
    {
        foreach ($metrics as $metric) {
            $reach = max(1, $metric['reach'] ?: ($metric['impressions'] ?? 0) ?: ($metric['likes'] ?? 0) * 15);

            $totalInteractions = (
                ($metric['likes']    ?? 0) * 1.0 +
                ($metric['comments'] ?? 0) * 2.0 +
                ($metric['shares']   ?? 0) * 3.0 +
                ($metric['saves']    ?? 0) * 2.0
            );

            $engagementRate  = round(
                (($metric['likes'] ?? 0) + ($metric['comments'] ?? 0) + ($metric['shares'] ?? 0))
                / $reach * 100, 2
            );
            $engagementScore = round($totalInteractions / $reach * 100, 2);

            // Upsert pour éviter les doublons
            AnMetric::updateOrCreate(
                [
                    'sm_account_id'   => $account->id,
                    'platform_post_id'=> $metric['platform_post_id'] ?? null,
                ],
                [
                    'user_id'         => $account->user_id,
                    'client_id'       => $account->client_id,
                    'platform'        => $metric['platform']   ?? $account->platform,
                    'content_type'    => $metric['content_type'] ?? null,
                    'likes'           => $metric['likes']      ?? 0,
                    'comments'        => $metric['comments']   ?? 0,
                    'shares'          => $metric['shares']     ?? 0,
                    'reach'           => $reach,
                    'impressions'     => $metric['impressions'] ?? 0,
                    'saves'           => $metric['saves']       ?? 0,
                    'followers'       => $metric['followers']   ?? 0,
                    'engagement_rate' => $engagementRate,
                    'engagement_score'=> $engagementScore,
                    'posted_at'       => $metric['posted_at']  ?? null,
                    'collected_at'    => now(),
                    'source'          => $metric['source']     ?? 'meta_api',
                ]
            );
        }
    }
}