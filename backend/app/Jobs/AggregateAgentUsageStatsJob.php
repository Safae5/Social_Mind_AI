<?php

namespace App\Jobs;

use App\Models\AgentActivityLog;
use App\Models\AgentUsageStat;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Agrège AgentActivityLog (source réelle, déjà peuplée par les contrôleurs
 * d'agents) en lignes quotidiennes agent_usage_stats — évite de calculer
 * ces stats en synchrone à chaque chargement du dashboard admin.
 *
 * api_cost_usd reste à 0 : aucun code de ce projet ne calcule de coût réel
 * aujourd'hui (HuggingFace Inference API gratuite, pas d'OpenAI/Anthropic —
 * vérifié Phase 6). Voir AiCostService pour l'architecture prête à
 * accueillir un vrai calcul si un provider payant est ajouté.
 */
class AggregateAgentUsageStatsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private readonly ?string $date = null) {}

    public function handle(): void
    {
        $date = $this->date ?? now()->toDateString();

        $rows = AgentActivityLog::whereDate('created_at', $date)
            ->selectRaw('agent_slug, user_id,
                count(*) as total_calls,
                sum(case when status = "error" then 1 else 0 end) as failed_calls,
                avg(case when started_at is not null and completed_at is not null
                    then timestampdiff(microsecond, started_at, completed_at) / 1000 end) as avg_latency_ms')
            ->groupBy('agent_slug', 'user_id')
            ->get();

        foreach ($rows as $row) {
            AgentUsageStat::updateOrCreate(
                ['agent_name' => $row->agent_slug, 'user_id' => $row->user_id, 'date' => $date],
                [
                    'total_calls'    => $row->total_calls,
                    'failed_calls'   => $row->failed_calls,
                    'avg_latency_ms' => $row->avg_latency_ms ? (int) round($row->avg_latency_ms) : 0,
                    'api_cost_usd'   => 0,
                    'tokens_used'    => 0,
                ]
            );
        }
    }
}
