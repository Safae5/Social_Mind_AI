<?php

namespace App\Services;

use App\Models\AnMetric;
use App\Models\AnReport;
use App\Models\Client;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Charge les métriques réelles d'un utilisateur, appelle le pipeline AI Engine
 * (/analytics/analyze) et sauvegarde le PDF + AnReport résultants.
 *
 * Logique unique partagée entre AnalyticsController::dashboard() (HTTP, à la
 * demande) et GenerateMonthlyAnalyticsReportJob (planifié, mensuel) — évite
 * de dupliquer ce pipeline dans les deux endroits.
 */
class AnalyticsReportService
{
    private string $aiEngineUrl;

    public function __construct()
    {
        $this->aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');
    }

    /**
     * @return array{success: bool, status?: string, message?: string, ai?: array, pdf_url?: ?string}
     */
    public function generate(
        User $user,
        ?int $accountId,
        ?int $clientId,
        int $periodDays = 30,
        string $reportType = 'monthly',
    ): array {
        $metricsData = AnMetric::where('user_id', $user->id)
            ->when($accountId, fn ($q) => $q->where('sm_account_id', $accountId))
            ->when($clientId, fn ($q) => $q->where('client_id', $clientId))
            ->orderBy('collected_at', 'desc')
            ->take(1000)
            ->get()
            ->map(fn ($m) => [
                'date'         => $m->collected_at,
                'platform'     => $m->platform,
                'content_type' => $m->content_type,
                'likes'        => $m->likes,
                'comments'     => $m->comments,
                'shares'       => $m->shares,
                'reach'        => $m->reach,
                'impressions'  => $m->impressions,
                'saves'        => $m->saves,
                'followers'    => $m->followers,
            ])->toArray();

        if (empty($metricsData)) {
            return ['success' => false, 'status' => 'no_data', 'message' => 'Aucune métrique disponible.'];
        }

        $clientName = $user->full_name;
        if ($clientId) {
            $client     = Client::find($clientId);
            $clientName = $client?->name ?? $user->full_name;
        }

        try {
            $response = Http::timeout(300)->post(
                "{$this->aiEngineUrl}/analytics/analyze",
                [
                    'client_name'  => $clientName,
                    'metrics'      => $metricsData,
                    'period_days'  => $periodDays,
                    'generate_pdf' => true,
                    'use_sample'   => false,
                ]
            );

            if ($response->failed()) {
                return ['success' => false, 'status' => 'ai_engine_failed', 'message' => 'AI Engine indisponible.'];
            }
        } catch (\Exception $e) {
            Log::error('AnalyticsReportService: ' . $e->getMessage());
            return ['success' => false, 'status' => 'ai_engine_failed', 'message' => $e->getMessage()];
        }

        $ai = $response->json();

        $pdfUrl  = null;
        $pdfPath = null;
        if (!empty($ai['pdf_base64'])) {
            try {
                $pdfContent = base64_decode($ai['pdf_base64']);
                $pdfPath    = "an_reports/{$user->id}/rapport_" . date('Y-m') . '.pdf';
                Storage::disk('public')->put($pdfPath, $pdfContent);
                $pdfUrl = Storage::disk('public')->url($pdfPath);

                AnReport::updateOrCreate(
                    [
                        'user_id'      => $user->id,
                        'report_type'  => $reportType,
                        'period_start' => now()->startOfMonth(),
                    ],
                    [
                        'sm_account_id' => $accountId,
                        'client_id'     => $clientId,
                        'period_label'  => now()->locale('fr')->translatedFormat('F Y'),
                        'period_end'    => now()->endOfMonth(),
                        'pdf_path'      => $pdfPath,
                        'pdf_url'       => $pdfUrl,
                        'kpis_summary'  => $ai['kpis'] ?? [],
                        'status'        => 'ready',
                    ]
                );
            } catch (\Exception $e) {
                Log::warning('AnReport PDF save error: ' . $e->getMessage());
            }
        }

        return ['success' => true, 'ai' => $ai, 'pdf_url' => $pdfUrl];
    }
}
