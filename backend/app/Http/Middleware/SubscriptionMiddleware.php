<?php

namespace App\Http\Middleware;

use App\Services\Subscription\SubscriptionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SubscriptionMiddleware
{
    public function __construct(
        private readonly SubscriptionService $subscriptionService
    ) {}

    public function handle(Request $request, Closure $next, string $feature = ''): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifié.',
            ], 401);
        }

        // Admin : accès total
        if ($user->isAdmin()) {
            return $next($request);
        }

        // Vérifie l'abonnement actif
        $subscription = $user->activeSubscription;

        if (!$subscription || !$subscription->isValid()) {
            return response()->json([
                'success'  => false,
                'message'  => 'Votre abonnement a expiré ou est inactif.',
                'code'     => 'SUBSCRIPTION_EXPIRED',
                'redirect' => '/upgrade',
                'data'     => [
                    'current_plan'   => $user->current_plan,
                    'trial_ends_at'  => $user->trial_ends_at?->toIso8601String(),
                    'is_trial_ended' => $user->trial_ends_at?->isPast(),
                ],
            ], 402);
        }

        // Vérifie une feature spécifique si demandée
        if ($feature && !$this->subscriptionService->canAccess($user, $feature)) {
            return response()->json([
                'success'  => false,
                'message'  => "La fonctionnalité '{$feature}' n'est pas incluse dans votre plan.",
                'code'     => 'FEATURE_NOT_AVAILABLE',
                'redirect' => '/upgrade',
                'data'     => [
                    'required_feature' => $feature,
                    'current_plan'     => $user->current_plan,
                ],
            ], 402);
        }

        return $next($request);
    }
}

