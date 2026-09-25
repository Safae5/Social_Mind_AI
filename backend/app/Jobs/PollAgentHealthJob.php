<?php

namespace App\Jobs;

use App\Models\AgentLog;
use App\Models\AgentStatus;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Vérifie la santé de l'ai-engine toutes les ~60s (planifié dans
 * routes/console.php) et met à jour agent_statuses pour les 13 agents.
 *
 * Limite architecturale honnête (voir main.py/health) : les 13 agents
 * partagent UN SEUL process FastAPI — il n'y a pas d'isolation par agent.
 * Un seul appel /health donne donc le même statut process-level à tous,
 * ce Job ne prétend PAS avoir une granularité par-agent qui n'existe pas.
 * Le "enabled" (activé/désactivé par un admin) n'est jamais écrasé ici —
 * seul AgentAvailabilityService::toggle() le modifie.
 */
class PollAgentHealthJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 30;

    public function handle(): void
    {
        $agents  = config('agents.agents');
        $url     = rtrim((string) config('services.ai_engine.url'), '/');
        $start   = microtime(true);
        $status  = 'error';
        $lastErr = null;

        try {
            $response  = Http::timeout(10)->get("{$url}/health");
            $latencyMs = (int) round((microtime(true) - $start) * 1000);

            if ($response->successful()) {
                $status = 'online';
            } else {
                $lastErr = "HTTP {$response->status()}";
            }
        } catch (\Exception $e) {
            $latencyMs = (int) round((microtime(true) - $start) * 1000);
            $lastErr   = $e->getMessage();
        }

        foreach ($agents as $agent) {
            $existing = AgentStatus::where('agent_name', $agent['slug'])->first();
            $enabled  = $existing?->enabled ?? true;

            // Un agent désactivé par un admin reste "disabled" même si le
            // process ai-engine répond — l'admin a explicitement coupé l'accès.
            $effectiveStatus = !$enabled ? 'disabled' : $status;

            AgentStatus::updateOrCreate(
                ['agent_name' => $agent['slug']],
                [
                    'status'     => $effectiveStatus,
                    'latency_ms' => $latencyMs,
                    'last_error' => $lastErr,
                    'enabled'    => $enabled,
                    'last_seen'  => now(),
                ]
            );

            if ($lastErr) {
                AgentLog::create([
                    'agent_name'  => $agent['slug'],
                    'level'       => 'error',
                    'message'     => "Health check échoué : {$lastErr}",
                    'context'     => ['url' => "{$url}/health"],
                    'duration_ms' => $latencyMs,
                    'created_at'  => now(),
                ]);
            }
        }

        if ($lastErr) {
            Log::warning("PollAgentHealthJob: ai-engine unreachable — {$lastErr}");
        }
    }
}
