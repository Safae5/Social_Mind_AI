<?php

namespace App\Services;

use App\Models\AoAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Client Google Ads API via GAQL (Google Ads Query Language).
 *
 * Query GAQL :
 *   SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks,
 *          metrics.cost_micros, metrics.conversions, metrics.conversion_value,
 *          metrics.ctr, metrics.average_cpc, metrics.average_cpm, segments.date
 *   FROM campaign WHERE segments.date DURING LAST_7_DAYS
 *
 * Prérequis :
 *   - Customer ID Google Ads (ex: 123-456-7890)
 *   - OAuth2 token Google Ads
 *   - Developer Token Google Ads API
 */
class GoogleAdsCollector
{
    private string $apiBase;

    public function __construct()
    {
        $version      = config('services.google_ads.api_version', 'v17');
        $this->apiBase = "https://googleads.googleapis.com/{$version}";
    }

    /**
     * Collecte les métriques de campagnes Google Ads via GAQL.
     *
     * @param  AoAccount $account  Compte ao_accounts de type 'google'
     * @return array               Liste des métriques
     */
    public function collectCampaigns(AoAccount $account): array
    {
        $token      = $account->getDecryptedAccessToken();
        $customerId = $account->platform_account_id; // sans tirets
        $metrics    = [];

        $query = <<<GAQL
            SELECT campaign.id, campaign.name, campaign.status,
                   metrics.impressions, metrics.clicks, metrics.cost_micros,
                   metrics.conversions, metrics.conversion_value,
                   metrics.ctr, metrics.average_cpc, metrics.average_cpm,
                   segments.date
            FROM campaign
            WHERE campaign.status != 'REMOVED'
              AND segments.date DURING LAST_7_DAYS
            ORDER BY metrics.impressions DESC
            LIMIT 100
            GAQL;

        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'Authorization'     => "Bearer {$token}",
                    'developer-token'   => config('services.google_ads.developer_token'),
                    'login-customer-id' => $customerId,
                    'Content-Type'      => 'application/json',
                ])
                ->post(
                    "{$this->apiBase}/customers/{$customerId}/googleAds:searchStream",
                    ['query' => $query]
                );

            if ($response->failed()) {
                Log::error("Google Ads API: " . $response->body());
                return [];
            }

            $results = $response->json();
            if (is_array($results)) {
                foreach ($results as $batch) {
                    foreach ($batch['results'] ?? [] as $row) {
                        $campaign    = $row['campaign']  ?? [];
                        $m           = $row['metrics']   ?? [];
                        $seg         = $row['segments']  ?? [];
                        $spend       = (float)($m['costMicros']       ?? 0) / 1_000_000;
                        $conv_value  = (float)($m['conversionValue']  ?? 0);
                        $conversions = (int)($m['conversions']        ?? 0);

                        $metrics[] = [
                            'campaign_id'   => $campaign['id']   ?? '',
                            'campaign_name' => $campaign['name'] ?? 'Google Campaign',
                            'platform'      => 'google',
                            'ad_type'       => 'Google Ads',
                            'date_start'    => $seg['date']  ?? now()->toDateString(),
                            'date_end'      => $seg['date']  ?? now()->toDateString(),
                            'impressions'   => (int)($m['impressions'] ?? 0),
                            'clicks'        => (int)($m['clicks']      ?? 0),
                            'spend'         => round($spend, 4),
                            'conversions'   => $conversions,
                            'revenue'       => round($conv_value, 2),
                            'ctr'           => (float)($m['ctr']        ?? 0) * 100,
                            'cpc'           => (float)($m['averageCpc'] ?? 0) / 1_000_000,
                            'cpm'           => (float)($m['averageCpm'] ?? 0) / 1_000_000,
                            'source'        => 'google_ads',
                        ];
                    }
                }
            }

            Log::info("Google Ads API {$customerId} : " . count($metrics) . " métriques");

        } catch (\Exception $e) {
            Log::error("GoogleAdsCollector: " . $e->getMessage());
        }

        return $metrics;
    }
}