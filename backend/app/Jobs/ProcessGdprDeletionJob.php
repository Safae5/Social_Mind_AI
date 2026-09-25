<?php

namespace App\Jobs;

use App\Models\GdprRequest;
use App\Models\TwoFactorSession;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Droit à l'effacement RGPD — anonymisation, PAS de suppression en cascade.
 *
 * Portée volontairement limitée à ce que l'audit FK (Phase 4) a validé comme sûr :
 *   - Anonymise les champs PII sur la ligne `users` elle-même.
 *   - Révoque toutes les sessions / tokens / 2FA.
 *   - Soft-delete l'utilisateur (users.deleted_at — la table est conçue pour ça,
 *     voir migration users : "suppression douce pour RGPD").
 *
 * Ne touche PAS aux ~35 tables liées par user_id (factures, campagnes, logs
 * d'activité agent, etc.) — beaucoup contiennent des données financières/légales
 * à conserver indépendamment de la demande d'effacement (factures notamment).
 * Une passe d'anonymisation plus profonde de ces tables (si des PII y résident
 * réellement, ex. noms dans du JSON) est un travail séparé et documenté comme
 * limitation restante — ne pas supposer qu'il est déjà couvert.
 */
class ProcessGdprDeletionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1; // opération sensible : pas de retry automatique silencieux

    public function __construct(private readonly GdprRequest $gdprRequest) {}

    public function handle(): void
    {
        $this->gdprRequest->update(['status' => 'processing']);

        try {
            $user = User::findOrFail($this->gdprRequest->user_id);

            $user->forceFill([
                'first_name'                 => 'Utilisateur',
                'last_name'                  => 'Supprimé',
                'email'                      => "deleted-user-{$user->id}@deleted.socialmindai.invalid",
                'phone'                      => null,
                'avatar'                     => null,
                'two_factor_enabled'         => false,
                'two_factor_secret'          => null,
                'two_factor_recovery_codes'  => null,
                'two_factor_confirmed_at'    => null,
                'brand_examples'             => null,
                'connected_platforms'        => [],
            ])->save();

            UserSession::where('user_id', $user->id)->delete();
            TwoFactorSession::where('user_id', $user->id)->delete();
            $user->tokens()->delete(); // Sanctum

            $user->delete(); // soft delete — users.deleted_at

            $this->gdprRequest->update([
                'status'       => 'completed',
                'completed_at' => now(),
            ]);

            Log::info("GDPR deletion completed for user #{$user->id} (request #{$this->gdprRequest->id})");

        } catch (\Throwable $e) {
            $this->gdprRequest->update([
                'status' => 'failed',
                'notes'  => $e->getMessage(),
            ]);
            Log::error("GDPR deletion failed for request #{$this->gdprRequest->id}: " . $e->getMessage());
        }
    }
}
