<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Jobs\GenerateWeeklyReportJob;
use App\Models\AgentActivityLog;
use App\Models\SocialAccount;
use App\Models\WeeklyReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WeeklyReportController extends Controller
{
    // ══════════════════════════════════════════════════════════
    // GET /api/weekly-reports — Historique des 12 derniers
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $reports = WeeklyReport::where('user_id', $user->id)
            ->orderByDesc('week_start')
            ->take(12)
            ->get()
            ->map(fn($r) => $r->getSummaryArray());

        $unread = WeeklyReport::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'reports'     => $reports,
                'unread_count'=> $unread,
                'total'       => $reports->count(),
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/weekly-reports/latest — Dernier rapport
    // ══════════════════════════════════════════════════════════

    public function latest(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user   = $request->user();
        $report = WeeklyReport::where('user_id', $user->id)
            ->orderByDesc('week_start')
            ->first();

        if (!$report) {
            return response()->json([
                'success' => true,
                'data'    => ['report' => null],
                'message' => 'Aucun rapport disponible. Votre premier rapport sera généré lundi prochain à 8h.',
            ]);
        }

        $report->markAsRead();

        return response()->json([
            'success' => true,
            'data'    => ['report' => $report->getSummaryArray()],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/weekly-reports/{id} — Rapport spécifique
    // ══════════════════════════════════════════════════════════

    public function show(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user   = $request->user();
        $report = WeeklyReport::where('user_id', $user->id)->findOrFail($id);
        $report->markAsRead();

        return response()->json([
            'success' => true,
            'data'    => ['report' => $report->getSummaryArray()],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/weekly-reports/generate — Générer maintenant
    // ══════════════════════════════════════════════════════════

    public function generateNow(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $account = SocialAccount::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('token_valid', true)
            ->first();

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun compte social connecté. Connectez un compte Instagram ou Facebook.',
            ], 422);
        }

        GenerateWeeklyReportJob::dispatch($account)->onQueue('default');

        AgentActivityLog::create([
            'user_id'    => $user->id,
            'agent_slug' => 'weekly-report',
            'agent_name' => 'Rapport Hebdomadaire',
            'action'     => 'report_generation',
            'description'=> "Rapport demandé manuellement pour le compte #{$account->id}",
            'status'     => 'pending',
            'started_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => '✅ Génération lancée ! Votre rapport sera disponible dans quelques minutes.',
        ]);
    }
}