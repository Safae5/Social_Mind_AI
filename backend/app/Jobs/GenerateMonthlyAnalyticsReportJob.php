<?php

namespace App\Jobs;

use App\Models\AgentActivityLog;
use App\Models\User;
use App\Services\AnalyticsReportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Génère et sauvegarde le rapport PDF mensuel Analytics — dispatché le 1er
 * de chaque mois (routes/console.php). Remplace l'ancien job planifié qui
 * ne faisait que relancer la collecte de métriques sans jamais produire de
 * rapport : le PDF "mensuel automatique" promis par le frontend n'existait
 * pas réellement avant ce correctif.
 */
class GenerateMonthlyAnalyticsReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;

    public function __construct(private readonly User $user) {}

    public function handle(AnalyticsReportService $reportService): void
    {
        $result = $reportService->generate($this->user, null, null, 30, 'monthly');

        if (!$result['success']) {
            Log::info("GenerateMonthlyAnalyticsReportJob user #{$this->user->id} : {$result['status']} — {$result['message']}");
            return;
        }

        AgentActivityLog::create([
            'user_id'    => $this->user->id,
            'agent_slug' => 'analytics',
            'agent_name' => 'Agent Analytics IA',
            'action'     => 'monthly_report_generated',
            'description'=> 'Rapport PDF mensuel généré automatiquement',
            'status'     => 'success',
            'metadata'   => ['pdf_url' => $result['pdf_url']],
            'completed_at' => now(),
        ]);
    }
}
