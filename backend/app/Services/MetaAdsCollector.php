<?php

namespace App\Services;

use App\Models\AoAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Client Meta Ads API v21.
 *
 * Endpoints utilisés :
 *   GET /act_{id}/campaigns?fields=name,status,budget_remaining,daily_budget
 *   GET /{campaign_id}/insights?fields=impressions,clicks,spend,actions,ctr,cpc,cpm,purchase_roas
 *   GET /act_{id}/adsets?fields=id,name,targeting,daily_budget
 *   GET /{adset_id}/insights?fields=impressions,clicks,spend,actions,ctr,cpc,cpm
 *
 * Permissions : ads_read, ads_management, business_management
 */
class MetaAdsCollector
{
    private string $graphBase;

    public function __construct()
    {
        $version         = config('services.meta.graph_version', 'v21.0');
        $this->graphBase = "https://graph.facebook.com/{$version}";
    }

    /**
     * Collecte les métriques de campagnes d'un compte Meta Ads.
     *
     * @param  AoAccount $account  Compte ao_accounts de type 'meta'
     * @return array               Liste des métriques
     */
    public function collectCampaigns(AoAccount $account): array
    {
        $token       = $account->getDecryptedAccessToken();
        $adAccountId = $account->platform_account_id; // "act_123456789"
        $metrics     = [];

        try {
            $campaignsResp = Http::timeout(30)->get(
                "{$this->graphBase}/{$adAccountId}/campaigns",
                [
                    'fields'       => 'id,name,status,objective,budget_remaining,daily_budget',
                    'access_token' => $token,
                    'limit'        => 100,
                ]
            );

            if ($campaignsResp->failed()) {
                Log::error("Meta Ads API campaigns: " . $campaignsResp->body());
                return [];
            }

            foreach ($campaignsResp->json()['data'] ?? [] as $campaign) {
                $insightsResp = Http::timeout(30)->get(
                    "{$this->graphBase}/{$campaign['id']}/insights",
                    [
                        'fields'         => 'impressions,clicks,spend,actions,ctr,cpc,cpm,reach,purchase_roas',
                        'date_preset'    => 'last_7d',
                        'access_token'   => $token,
                        'time_increment' => 1,
                    ]
                );

                if ($insightsResp->failed()) continue;

                foreach ($insightsResp->json()['data'] ?? [] as $insight) {
                    $conversions = 0;
                    $revenue     = 0;
                    foreach ($insight['actions'] ?? [] as $action) {
                        if (in_array($action['action_type'], ['purchase', 'offsite_conversion.fb_pixel_purchase'])) {
                            $conversions += (int)($action['value'] ?? 0);
                        }
                    }
                    $roas_arr = $insight['purchase_roas'] ?? [];
                    $roas     = !empty($roas_arr) ? (float)$roas_arr[0]['value'] : 0;
                    $spend    = (float)($insight['spend'] ?? 0);
                    if ($roas > 0 && $spend > 0) {
                        $revenue = $roas * $spend;
                    }

                    $metrics[] = [
                        'campaign_id'   => $campaign['id'],
                        'campaign_name' => $campaign['name'],
                        'platform'      => 'meta',
                        'ad_type'       => 'Meta Ads',
                        'date_start'    => $insight['date_start'] ?? now()->toDateString(),
                        'date_end'      => $insight['date_stop']  ?? now()->toDateString(),
                        'impressions'   => (int)($insight['impressions'] ?? 0),
                        'clicks'        => (int)($insight['clicks']      ?? 0),
                        'spend'         => $spend,
                        'conversions'   => $conversions,
                        'revenue'       => round($revenue, 2),
                        'ctr'           => (float)($insight['ctr']  ?? 0),
                        'cpc'           => (float)($insight['cpc']  ?? 0),
                        'cpm'           => (float)($insight['cpm']  ?? 0),
                        'source'        => 'meta_ads',
                    ];
                }
            }

            Log::info("Meta Ads API {$adAccountId} : " . count($metrics) . " métriques");

        } catch (\Exception $e) {
            Log::error("MetaAdsCollector: " . $e->getMessage());
        }

        return $metrics;
    }

    /**
     * Collecte les insights par Ad Set (segmentation audience).
     * Fournit les données âge/genre pour l'audience_classifier.
     */
    public function collectAdSetInsights(AoAccount $account): array
    {
        $token       = $account->getDecryptedAccessToken();
        $adAccountId = $account->platform_account_id;
        $metrics     = [];

        try {
            $resp = Http::timeout(30)->get(
                "{$this->graphBase}/{$adAccountId}/adsets",
                [
                    'fields'       => 'id,name,targeting,status,daily_budget',
                    'access_token' => $token,
                    'limit'        => 100,
                ]
            );

            if ($resp->failed()) return [];

            foreach ($resp->json()['data'] ?? [] as $adset) {
                $targeting  = $adset['targeting'] ?? [];
                $ages       = $targeting['age_min'] ?? '18';
                $genders    = $targeting['genders'] ?? [0];
                $gender_str = match($genders[0] ?? 0) {
                    1 => "Male", 2 => "Female", default => "All"
                };

                $insightsResp = Http::timeout(30)->get(
                    "{$this->graphBase}/{$adset['id']}/insights",
                    [
                        'fields'       => 'impressions,clicks,spend,actions,ctr,cpc,cpm',
                        'date_preset'  => 'last_7d',
                        'access_token' => $token,
                    ]
                );

                foreach ($insightsResp->json()['data'] ?? [] as $insight) {
                    $conversions = 0;
                    foreach ($insight['actions'] ?? [] as $action) {
                        if (str_contains($action['action_type'], 'purchase')) {
                            $conversions += (int)($action['value'] ?? 0);
                        }
                    }
                    $metrics[] = [
                        'campaign_name'   => $adset['name'],
                        'platform'        => 'meta',
                        'audience_age'    => "{$ages}+",
                        'audience_gender' => $gender_str,
                        'ad_type'         => 'Meta Ads',
                        'impressions'     => (int)($insight['impressions'] ?? 0),
                        'clicks'          => (int)($insight['clicks']      ?? 0),
                        'spend'           => (float)($insight['spend']     ?? 0),
                        'conversions'     => $conversions,
                        'revenue'         => $conversions * 50,
                        'ctr'             => (float)($insight['ctr']  ?? 0),
                        'cpc'             => (float)($insight['cpc']  ?? 0),
                        'cpm'             => (float)($insight['cpm']  ?? 0),
                        'date_start'      => now()->subDays(7)->toDateString(),
                        'date_end'        => now()->toDateString(),
                        'source'          => 'meta_ads',
                    ];
                }
            }

        } catch (\Exception $e) {
            Log::error("MetaAdsCollector AdSet: " . $e->getMessage());
        }

        return $metrics;
    }
}