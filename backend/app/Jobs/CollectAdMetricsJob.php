<?php

namespace App\Jobs;

use App\Models\AgentActivityLog;
use App\Models\AoAccount;
use App\Models\AoCampaign;
use App\Models\User;
use App\Services\GoogleAdsCollector;
use App\Services\MetaAdsCollector;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Job de collecte quotidienne des métriques publicitaires.
 * Dispatché par Laravel Scheduler → daily() (minuit).
 *
 * Flux :
 *   1. Récupère les ao_accounts actifs de l'utilisateur (Meta + Google)
 *   2. MetaAdsCollector → campagnes + ad sets insights
 *   3. GoogleAdsCollector → campagnes GAQL
 *   4. Stocke dans ao_campaigns avec KPIs calculés
 */
class CollectAdMetricsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;

    public function __construct(private readonly User $user) {}

    public function handle(
        MetaAdsCollector  $metaCollector,
        GoogleAdsCollector $googleCollector
    ): void {
        Log::info("CollectAdMetrics start — user #{$this->user->id}");
        $allMetrics = [];

        // ── 1. Meta Ads API ────────────────────────────────────
        $metaAccounts = AoAccount::where('user_id', $this->user->id)
            ->where('platform', 'meta')
            ->active()
            ->get();

        foreach ($metaAccounts as $account) {
            $campaignMetrics = $metaCollector->collectCampaigns($account);
            $adSetMetrics    = $metaCollector->collectAdSetInsights($account);
            $allMetrics      = array_merge($allMetrics, $campaignMetrics, $adSetMetrics);
        }

        // ── 2. Google Ads API ──────────────────────────────────
        $googleAccounts = AoAccount::where('user_id', $this->user->id)
            ->where('platform', 'google')
            ->active()
            ->get();

        foreach ($googleAccounts as $account) {
            $googleMetrics = $googleCollector->collectCampaigns($account);
            $allMetrics    = array_merge($allMetrics, $googleMetrics);
        }

        $this->saveMetrics($allMetrics);

        // ── Log activité Agent 6 ──────────────────────────────
        AgentActivityLog::create([
            'user_id'    => $this->user->id,
            'agent_slug' => 'ad-optimizer',
            'agent_name' => 'Agent Optimisation Publicitaire',
            'action'     => 'ad_metrics_collected',
            'description'=> "Collecte quotidienne — " . count($allMetrics) . " métriques — ao_campaigns",
            'status'     => 'success',
            'metadata'   => ['total' => count($allMetrics), 'sources' => ['meta_ads', 'google_ads']],
            'completed_at'=> now(),
        ]);

        Log::info("CollectAdMetrics done — user #{$this->user->id} : " . count($allMetrics) . " entrées dans ao_campaigns");
    }

    private function saveMetrics(array $metrics): void
    {
        foreach ($metrics as $metric) {
            $spend       = max(0.0001, (float)($metric['spend']       ?? 0));
            $impressions = max(1,      (int)($metric['impressions']   ?? 1));
            $clicks      = (int)($metric['clicks']      ?? 0);
            $conversions = (int)($metric['conversions'] ?? 0);
            $revenue     = (float)($metric['revenue']   ?? 0);

            $ctr    = $clicks      > 0 ? round($clicks / $impressions * 100, 4) : 0;
            $cpc    = $clicks      > 0 ? round($spend / $clicks, 4)             : 0;
            $cpa    = $conversions > 0 ? round($spend / $conversions, 4)        : $spend;
            $roas   = $spend       > 0 ? round($revenue / $spend, 4)            : 0;
            $cpm    = round($spend / $impressions * 1000, 4);

            $conv_rate  = $clicks > 0 ? $conversions / $clicks * 100 : 0;
            $perf_score = round(
                ($roas / 10) * 40 + ($ctr / 5) * 30 + ($conv_rate / 10) * 30, 2
            );

            $status = 'Normal';
            if ($ctr  < 0.5)        $status = 'CTR Faible';
            if ($roas < 1.0)        $status = 'ROAS Négatif';
            if ($perf_score >= 70)  $status = 'Top Performer';

            AoCampaign::updateOrCreate(
                [
                    'user_id'    => $this->user->id,
                    'campaign_id'=> $metric['campaign_id'] ?? null,
                    'platform'   => $metric['platform']    ?? 'meta',
                    'date_start' => $metric['date_start']  ?? now()->toDateString(),
                ],
                [
                    'campaign_name'   => $metric['campaign_name']   ?? 'Campagne',
                    'ad_type'         => $metric['ad_type']         ?? null,
                    'audience_age'    => $metric['audience_age']    ?? null,
                    'audience_gender' => $metric['audience_gender'] ?? null,
                    'impressions'     => $impressions,
                    'clicks'          => $clicks,
                    'spend'           => $spend,
                    'conversions'     => $conversions,
                    'revenue'         => $revenue,
                    'ctr'             => $ctr,
                    'cpc'             => $cpc,
                    'cpa'             => $cpa,
                    'roas'            => $roas,
                    'cpm'             => $cpm,
                    'performance_score'=> $perf_score,
                    'status'          => $status,
                    'date_end'        => $metric['date_end'] ?? now()->toDateString(),
                    'source'          => $metric['source']   ?? 'meta_ads',
                ]
            );
        }
    }
}