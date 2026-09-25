<?php

namespace App\Http\Middleware;

use App\Services\Admin\AgentAvailabilityService;
use App\Services\Admin\AgentQuotaService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Point d'application UNIQUE pour enable/disable (9.5) + quota IA (9.6),
 * appliqué en route via Route::middleware("agent:slug") — pas de logique
 * dupliquée dans chaque contrôleur d'agent.
 */
class EnforceAgentAvailability
{
    public function __construct(
        private readonly AgentAvailabilityService $availability,
        private readonly AgentQuotaService $quota,
    ) {}

    public function handle(Request $request, Closure $next, string $agentSlug): Response
    {
        try {
            $this->availability->ensureEnabled($agentSlug);

            $user = $request->user();
            if ($user && !$user->isAdmin()) {
                $this->quota->assertWithinDailyQuota($user, $agentSlug);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'code'    => $e->getCode() === 429 ? 'QUOTA_EXCEEDED' : 'AGENT_DISABLED',
            ], $e->getCode() ?: 503);
        }

        return $next($request);
    }
}
