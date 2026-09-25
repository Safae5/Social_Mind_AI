<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AgentActivityLog;
use App\Models\AgentLog;
use App\Models\AgentModelConfig;
use App\Models\AgentStatus;
use App\Models\AgentUsageStat;
use App\Services\Admin\AgentAvailabilityService;
use App\Services\Admin\AiCostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAgentController extends Controller
{
    public function __construct(
        private readonly AgentAvailabilityService $availability,
        private readonly AiCostService $costService,
    ) {}

    // ══════════════════════════════════════════════════════════
    // GET /api/admin/ai-agents — 9.1 / 9.2
    // ══════════════════════════════════════════════════════════

    public function index(): JsonResponse
    {
        $registry = collect(config('agents.agents'));
        $statuses = AgentStatus::whereIn('agent_name', $registry->pluck('slug'))->get()->keyBy('agent_name');
        $today    = today();

        $callsToday = AgentActivityLog::whereDate('created_at', $today)
            ->selectRaw('agent_slug, count(*) as total, sum(case when status = "error" then 1 else 0 end) as errors,
                avg(case when started_at is not null and completed_at is not null
                    then timestampdiff(microsecond, started_at, completed_at) / 1000 end) as avg_latency_ms')
            ->groupBy('agent_slug')->get()->keyBy('agent_slug');

        $agents = $registry->map(function ($agent) use ($statuses, $callsToday) {
            $status = $statuses->get($agent['slug']);
            $usage  = $callsToday->get($agent['slug']);

            return [
                'slug'            => $agent['slug'],
                'name'            => $agent['name'],
                'tier'            => $agent['tier'],
                'status'          => $status?->status ?? 'error',
                'enabled'         => $status?->enabled ?? true,
                'last_seen'       => $status?->last_seen?->toIso8601String(),
                'latency_ms'      => $status?->latency_ms,
                'last_error'      => $status?->last_error,
                'calls_today'     => (int) ($usage?->total ?? 0),
                'errors_today'    => (int) ($usage?->errors ?? 0),
                'avg_latency_ms'  => $usage?->avg_latency_ms ? (int) round($usage->avg_latency_ms) : null,
            ];
        });

        return response()->json(['success' => true, 'data' => ['agents' => $agents]]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/admin/ai-agents/{slug} — 9.2 / 9.4
    // ══════════════════════════════════════════════════════════

    public function show(string $slug): JsonResponse
    {
        $agent = collect(config('agents.agents'))->firstWhere('slug', $slug);
        if (!$agent) {
            return response()->json(['success' => false, 'message' => 'Agent inconnu.'], 404);
        }

        $status = AgentStatus::where('agent_name', $slug)->first();

        $usageTrend = AgentUsageStat::where('agent_name', $slug)
            ->where('date', '>=', now()->subDays(30))
            ->selectRaw('date, sum(total_calls) as total_calls, sum(failed_calls) as failed_calls, sum(api_cost_usd) as cost')
            ->groupBy('date')->orderBy('date')->get();

        $recentLogs = AgentLog::where('agent_name', $slug)->orderByDesc('created_at')->take(20)->get();

        $recentActivity = AgentActivityLog::where('agent_slug', $slug)
            ->orderByDesc('created_at')->take(20)
            ->get(['id', 'user_id', 'action', 'status', 'description', 'error_message', 'started_at', 'completed_at', 'created_at']);

        return response()->json([
            'success' => true,
            'data'    => [
                'agent'       => $agent,
                'status'      => [
                    'status'     => $status?->status ?? 'error',
                    'enabled'    => $status?->enabled ?? true,
                    'last_seen'  => $status?->last_seen?->toIso8601String(),
                    'latency_ms' => $status?->latency_ms,
                    'last_error' => $status?->last_error,
                ],
                'usage_trend_30d' => $usageTrend,
                'recent_logs'     => $recentLogs,
                'recent_activity' => $recentActivity,
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/admin/ai-agents/{slug}/toggle — 9.5
    // ══════════════════════════════════════════════════════════

    public function toggle(Request $request, string $slug): JsonResponse
    {
        $request->validate(['enabled' => ['required', 'boolean']]);

        try {
            $status = $this->availability->toggle($request->user(), $slug, $request->boolean('enabled'), $request);
            return response()->json(['success' => true, 'data' => ['status' => $status]]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/admin/ai-agents/logs — 9.4 (filtrable niveau/agent/dates)
    // ══════════════════════════════════════════════════════════

    public function logs(Request $request): JsonResponse
    {
        $query = AgentLog::query();

        if ($level = $request->query('level')) {
            $query->where('level', $level);
        }
        if ($agent = $request->query('agent')) {
            $query->where('agent_name', $agent);
        }
        if ($from = $request->query('date_from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('date_to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        $logs = $query->orderByDesc('created_at')->paginate(min(100, (int) $request->query('per_page', 30)));

        return response()->json([
            'success' => true,
            'data'    => [
                'logs'       => $logs->items(),
                'pagination' => [
                    'current_page' => $logs->currentPage(),
                    'last_page'    => $logs->lastPage(),
                    'total'        => $logs->total(),
                ],
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/admin/ai-agents/costs — 9.3
    // ══════════════════════════════════════════════════════════

    public function costs(): JsonResponse
    {
        $byAgent = AgentUsageStat::where('date', '>=', now()->subDays(30))
            ->selectRaw('agent_name, sum(api_cost_usd) as cost_30d, sum(total_calls) as calls_30d')
            ->groupBy('agent_name')->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'providers_in_use'    => $this->costService->providersInUse(),
                'paid_provider_configured' => $this->costService->hasAnyPaidProviderConfigured(),
                'cost_by_agent_30d'   => $byAgent,
                'total_cost_30d'      => (float) $byAgent->sum('cost_30d'),
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET/PATCH /api/admin/ai-agents/{slug}/config — 9.7
    // ══════════════════════════════════════════════════════════

    public function getConfig(string $slug): JsonResponse
    {
        $stored = AgentModelConfig::where('agent_slug', $slug)->get();
        return response()->json(['success' => true, 'data' => ['config' => $stored]]);
    }

    public function updateConfig(Request $request, string $slug): JsonResponse
    {
        $request->validate([
            'config_key'    => ['required', 'string', 'max:100'],
            'desired_value' => ['required', 'string', 'max:255'],
        ]);

        $config = AgentModelConfig::updateOrCreate(
            ['agent_slug' => $slug, 'config_key' => $request->config_key],
            ['desired_value' => $request->desired_value, 'applied' => false, 'updated_by' => $request->user()->id]
        );

        app(\App\Services\Admin\AdminAuditLogService::class)->log(
            admin: $request->user(),
            action: 'agent.config_changed',
            targetType: 'Agent',
            targetId: null,
            after: ['agent' => $slug, 'config_key' => $request->config_key, 'desired_value' => $request->desired_value],
            request: $request,
        );

        return response()->json([
            'success' => true,
            'message' => 'Changement enregistré — nécessite une mise à jour de ai-engine/.env et un redémarrage du process pour être appliqué (pas de hot-swap dans cette architecture).',
            'data'    => ['config' => $config],
        ]);
    }
}
