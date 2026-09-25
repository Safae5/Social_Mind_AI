<?php

namespace App\Services\Admin;

use App\Models\AgentStatus;
use App\Models\User;
use Illuminate\Http\Request;

class AgentAvailabilityService
{
    public function __construct(private readonly AdminAuditLogService $auditLog) {}

    public function toggle(User $admin, string $slug, bool $enabled, Request $request): AgentStatus
    {
        $agentSlugs = collect(config('agents.agents'))->pluck('slug');
        if (!$agentSlugs->contains($slug)) {
            throw new \Exception("Agent inconnu : {$slug}.", 404);
        }

        $status = AgentStatus::firstOrCreate(['agent_name' => $slug], ['status' => 'error', 'enabled' => true]);
        $before = ['enabled' => $status->enabled];

        $status->update([
            'enabled' => $enabled,
            'status'  => $enabled ? $status->status : 'disabled',
        ]);

        $this->auditLog->log(
            admin: $admin,
            action: $enabled ? 'agent.enabled' : 'agent.disabled',
            targetType: 'Agent',
            targetId: null,
            before: array_merge($before, ['agent' => $slug]),
            after: ['enabled' => $enabled, 'agent' => $slug],
            request: $request,
        );

        return $status->fresh();
    }

    /**
     * Point d'application réel — appelé au début de chaque contrôleur
     * d'agent. Lève une exception claire (jamais une réponse IA fabriquée)
     * si l'agent est désactivé par un admin.
     */
    public function ensureEnabled(string $slug): void
    {
        $enabled = AgentStatus::where('agent_name', $slug)->value('enabled');

        // Pas de ligne = jamais togglé = activé par défaut (comportement
        // actuel avant toute action admin explicite).
        if ($enabled === false) {
            throw new \Exception(
                "Cet agent est actuellement désactivé par un administrateur. Réessayez plus tard.",
                503
            );
        }
    }
}
