<?php

namespace App\Http\Controllers\Api\Professional;

use App\Http\Controllers\Controller;
use App\Models\AgentActivityLog;
use App\Models\Client;
use App\Models\InvoicesforClient as Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsAggregateController extends Controller
{
    // ══════════════════════════════════════════════════════════
    // GET /api/professional/analytics — KPIs agrégés
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $clientId = $request->query('client_id');
        $period   = $request->query('period', '30'); // jours

        // Clients actifs
        $activeClients = Client::where('user_id', $user->id)
            ->where('status', 'active')->count();

        // Revenus du mois
        $monthlyRevenue = Invoice::where('user_id', $user->id)
            ->where('status', 'paid')
            ->whereMonth('paid_date', now()->month)
            ->sum('total');

        // Activité des agents
        $agentStats = AgentActivityLog::where('user_id', $user->id)
            ->where('created_at', '>=', now()->subDays((int)$period))
            ->select('agent_slug', 'status', DB::raw('count(*) as count'))
            ->groupBy('agent_slug', 'status')
            ->get()
            ->groupBy('agent_slug');

        // Résumé par agent
        $agentSummary = [];
        foreach (AgentActivityLog::$AGENTS as $slug => $info) {
            $stats         = $agentStats[$slug] ?? collect();
            $successCount  = $stats->where('status', 'success')->first()?->count ?? 0;
            $errorCount    = $stats->where('status', 'error')->first()?->count ?? 0;

            $agentSummary[] = [
                'slug'    => $slug,
                'name'    => $info['name'],
                'icon'    => $info['icon'],
                'success' => $successCount,
                'errors'  => $errorCount,
            ];
        }

        // Factures
        $invoiceStats = [
            'total_paid'    => Invoice::where('user_id', $user->id)->where('status', 'paid')->sum('total'),
            'pending'       => Invoice::where('user_id', $user->id)->where('status', 'sent')->count(),
            'overdue'       => Invoice::where('user_id', $user->id)->where('status', 'sent')->where('due_date', '<', now())->count(),
        ];

        return response()->json([
            'success' => true,
            'data'    => [
                'kpis' => [
                    'active_clients'  => $activeClients,
                    'monthly_revenue' => $monthlyRevenue,
                    'total_agents'    => 7,
                    'active_agents'   => count(array_filter($agentSummary, fn($a) => $a['success'] > 0)),
                ],
                'agent_summary'  => $agentSummary,
                'invoice_stats'  => $invoiceStats,
                'period_days'    => $period,
            ],
        ]);
    }
}