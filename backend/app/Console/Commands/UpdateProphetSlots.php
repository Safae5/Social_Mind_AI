<?php

namespace App\Console\Commands;

use App\Models\SmProphetSlot;
use App\Models\SmAccount;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class UpdateProphetSlots extends Command
{
    protected $signature   = 'social:update-prophet-slots';
    protected $description = 'Recalcule les créneaux Prophet pour tous les comptes (dimanche 8h)';

    public function handle(): void
    {
        $accounts = SmAccount::where('platform', 'facebook')->active()->get();
        $this->info("Recalcul Prophet — {$accounts->count()} comptes");

        foreach ($accounts as $account) {
            try {
                $response = Http::timeout(300)->post(
                    config('services.ai_engine.url') . '/social-manager/optimal-slots',
                    [
                        'page_access_token' => $account->getDecryptedAccessToken(),
                        'page_id'           => $account->account_id,
                        'ig_user_id'        => $account->ig_user_id,
                        'days_back'         => 90,
                        'forecast_days'     => 7,
                    ]
                );

                if ($response->failed()) continue;

                $data = $response->json();

                // Supprimer les anciens slots futurs
                SmProphetSlot::where('social_account_id', $account->id)
                    ->where('slot_datetime', '>', now())
                    ->delete();

                // Créer les nouveaux
                foreach ($data['optimal_slots'] ?? [] as $slot) {
                    SmProphetSlot::create([
                        'social_account_id' => $account->id,
                        'slot_datetime'     => $slot['datetime'],
                        'predicted_score'   => $slot['predicted_engagement'],
                        'lower_bound'       => $slot['lower_bound'],
                        'upper_bound'       => $slot['upper_bound'],
                    ]);
                }

                Log::info("ProphetSlots mis à jour — compte #{$account->id}");

            } catch (\Exception $e) {
                Log::error("ProphetSlots erreur #{$account->id}: " . $e->getMessage());
            }
        }
        $this->info('✅ Prophet slots mis à jour');
    }
}