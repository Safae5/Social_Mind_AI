<?php

namespace App\Jobs;

use App\Models\SocialAccount;
use App\Services\Scheduler\SchedulerService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class AnalyzeOptimalSlotsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
    public int $tries   = 2;

    // ── Supprime public string $queue = 'ai' ──────────────────
    // Utilise $this->onQueue() dans le constructeur à la place

    public function __construct(
        public readonly SocialAccount $account,
    ) {
        $this->onQueue('ai');
    }

    public function handle(SchedulerService $schedulerService): void
    {
        Log::info("AnalyzeOptimalSlotsJob démarré pour compte #{$this->account->id}");

        $result = $schedulerService->runAnalysisNow($this->account);

        Log::info("AnalyzeOptimalSlotsJob terminé", [
            'account_id'    => $this->account->id,
            'slots_found'   => count($result['optimal_slots'] ?? []),
            'posts_analyzed'=> $result['data_points'] ?? 0,
            'data_source'   => $result['data_source'] ?? 'unknown',
        ]);
    }

    public function failed(\Throwable $e): void
    {
        Log::error("AnalyzeOptimalSlotsJob failed pour compte #{$this->account->id}", [
            'error' => $e->getMessage(),
        ]);

        $this->account->update(['last_synced_at' => null]);
    }
}