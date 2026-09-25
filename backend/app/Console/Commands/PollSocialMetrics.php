<?php

namespace App\Console\Commands;

use App\Models\SmAccount;
use App\Models\SmEngagementMetric;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PollSocialMetrics extends Command
{
    protected $signature   = 'social:poll-metrics';
    protected $description = 'Collecte les métriques de Page Meta Graph API (toutes les heures)';

    public function handle(): void
    {
        $accounts = SmAccount::where('platform', 'facebook')
            ->active()
            ->get();

        $this->info("Collecte métriques — {$accounts->count()} comptes actifs");

        foreach ($accounts as $account) {
            try {
                $response = Http::timeout(30)->post(
                    config('services.ai_engine.url') . '/social-manager/page-metrics',
                    [
                        'page_access_token' => $account->getDecryptedAccessToken(),
                        'page_id'           => $account->account_id,
                        'message'           => '',
                    ]
                );

                if ($response->failed()) {
                    Log::error("PollMetrics: compte #{$account->id} erreur — " . $response->body());
                    continue;
                }

                $metrics   = $response->json()['metrics'] ?? [];
                $recordedAt = now();

                foreach ($metrics as $type => $value) {
                    SmEngagementMetric::create([
                        'social_account_id' => $account->id,
                        'metric_type'       => $type,
                        'value'             => (int) $value,
                        'recorded_at'       => $recordedAt,
                    ]);
                }

                Log::info("PollMetrics: " . count($metrics) . " métriques enregistrées — compte #{$account->id}");

            } catch (\Exception $e) {
                Log::error("PollMetrics erreur compte #{$account->id}: " . $e->getMessage());
            }
        }
        $this->info('✅ Collecte terminée');
    }
}
