<?php

namespace App\Services\Admin;

use App\Models\AgentActivityLog;
use App\Models\User;
use App\Services\Subscription\SubscriptionService;

/**
 * Point UNIQUE d'application des quotas IA par plan — évite de dupliquer
 * cette logique dans chaque contrôleur d'agent (spec 9.6).
 *
 * Réutilise ce qui existait déjà mais n'était appelé nulle part :
 * Plan.limits['ai_calls_per_day'] + SubscriptionService::getLimit().
 * "Utilisé aujourd'hui" = compte réel sur AgentActivityLog, pas un
 * compteur séparé à maintenir en double.
 */
class AgentQuotaService
{
    public function __construct(private readonly SubscriptionService $subscriptionService) {}

    /**
     * @throws \Exception (code 429) si le quota du jour est dépassé.
     */
    public function assertWithinDailyQuota(User $user, string $agentSlug): void
    {
        $limit = $this->subscriptionService->getLimit($user, 'ai_calls_per_day');

        if ($limit < 0) {
            return; // -1 = illimité (convention déjà utilisée dans Plan.limits)
        }

        $usedToday = AgentActivityLog::where('user_id', $user->id)
            ->whereDate('created_at', today())
            ->count();

        if ($usedToday >= $limit) {
            throw new \Exception(
                "Quota d'appels IA quotidien atteint ({$limit}/jour pour votre plan). Réessayez demain ou changez de plan.",
                429
            );
        }
    }
}
