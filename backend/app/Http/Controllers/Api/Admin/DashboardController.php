<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AgentStatus;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    // ══════════════════════════════════════════════════════════
    // GET /api/admin/dashboard
    // Vue d'ensemble — chiffres réels, jamais de données simulées.
    // agents_online reste à 0 tant que Phase 6 (PollAgentHealthJob)
    // n'a pas encore peuplé agent_statuses — c'est l'état réel actuel,
    // pas une valeur fictive.
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'total_users'         => User::count(),
                'users_by_role'       => User::selectRaw('role, count(*) as count')
                    ->groupBy('role')->pluck('count', 'role'),
                'active_subscriptions'=> Subscription::whereIn('status', ['active', 'trialing'])->count(),
                'agents_online'       => AgentStatus::where('status', 'online')->count(),
                'agents_total'        => 13,
                'admin'               => [
                    'id'    => $request->user()->id,
                    'email' => $request->user()->email,
                ],
            ],
        ]);
    }
}
