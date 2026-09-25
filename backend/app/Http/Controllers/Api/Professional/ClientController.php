<?php

namespace App\Http\Controllers\Api\Professional;

use App\Http\Controllers\Controller;
use App\Models\AgentActivityLog;
use App\Models\Client;
use App\Models\ClientWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    // ══════════════════════════════════════════════════════════
    // GET /api/professional/clients
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user  = $request->user();
        $query = Client::where('user_id', $user->id)
            ->with('workspace')
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('company_name', 'like', "%{$request->search}%");
            });
        }

        $clients = $query->paginate(20)->through(fn($c) => $this->formatClient($c));

        return response()->json([
            'success' => true,
            'data'    => $clients,
            'stats'   => [
                'total'    => Client::where('user_id', $user->id)->count(),
                'active'   => Client::where('user_id', $user->id)->where('status', 'active')->count(),
                'paused'   => Client::where('user_id', $user->id)->where('status', 'paused')->count(),
                'prospect' => Client::where('user_id', $user->id)->where('status', 'prospect')->count(),
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/clients
    // ══════════════════════════════════════════════════════════

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:200',
            'company_name'     => 'nullable|string|max:200',
            'email'            => 'nullable|email',
            'phone'            => 'nullable|string|max:20',
            'website'          => 'nullable|url',
            'country'          => 'nullable|string|max:100',
            'city'             => 'nullable|string|max:100',
            'industry'         => 'nullable|string|max:100',
            'niche'            => 'nullable|string|max:100',
            'contract_type'    => 'nullable|in:monthly_retainer,project_based,hourly,performance_based',
            'contract_start'   => 'nullable|date',
            'contract_end'     => 'nullable|date',
            'monthly_retainer' => 'nullable|numeric|min:0',
            'project_budget'   => 'nullable|numeric|min:0',
            'currency'         => 'nullable|string|size:3',
            'services'         => 'nullable|array',
            'platforms'        => 'nullable|array',
            'assigned_agents'  => 'nullable|array',
            'status'           => 'nullable|in:active,paused,archived,prospect',
            'notes'            => 'nullable|string',
        ]);

        /** @var \App\Models\User $user */
        $user   = $request->user();
        $client = Client::create(array_merge(
            $validated,
            ['user_id' => $user->id]
        ));

        // Crée automatiquement le workspace
        ClientWorkspace::create([
            'user_id'   => $user->id,
            'client_id' => $client->id,
            'name'      => "Workspace — {$client->name}",
        ]);

        // Log d'activité
        AgentActivityLog::create([
            'user_id'    => $user->id,
            'client_id'  => $client->id,
            'agent_slug' => 'account-manager',
            'agent_name' => 'Agent Chef de Compte',
            'action'     => 'client_added',
            'description'=> "Nouveau client ajouté : {$client->name}",
            'status'     => 'success',
        ]);

        return response()->json([
            'success' => true,
            'message' => '✅ Client ajouté avec succès !',
            'data'    => ['client' => $this->formatClient($client->load('workspace'))],
        ], 201);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/clients/{id}
    // ══════════════════════════════════════════════════════════

    public function show(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user   = $request->user();
        $client = Client::where('user_id', $user->id)
            ->with(['workspace', 'invoices', 'activityLogs' => fn($q) => $q->latest()->limit(20)])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => ['client' => $this->formatClient($client, detailed: true)],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // PUT /api/professional/clients/{id}
    // ══════════════════════════════════════════════════════════

    public function update(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user   = $request->user();
        $client = Client::where('user_id', $user->id)->findOrFail($id);
        $client->update($request->only([
            'name', 'company_name', 'email', 'phone', 'website',
            'country', 'city', 'industry', 'niche',
            'contract_type', 'contract_start', 'contract_end',
            'monthly_retainer', 'project_budget', 'currency',
            'services', 'platforms', 'assigned_agents',
            'status', 'notes', 'target_kpis',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Client mis à jour.',
            'data'    => ['client' => $this->formatClient($client->fresh())],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // DELETE /api/professional/clients/{id}
    // ══════════════════════════════════════════════════════════

    public function destroy(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user   = $request->user();
        $client = Client::where('user_id', $user->id)->findOrFail($id);
        $client->update(['status' => 'archived']);
        $client->delete();

        return response()->json(['success' => true, 'message' => 'Client archivé.']);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/professional/clients/{id}/workspace
    // ══════════════════════════════════════════════════════════

    public function workspace(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user   = $request->user();
        $client = Client::where('user_id', $user->id)->findOrFail($id);
        $ws     = $client->workspace ?? ClientWorkspace::create([
            'user_id'   => $user->id,
            'client_id' => $client->id,
            'name'      => "Workspace — {$client->name}",
        ]);

        // Récupère les données workspace
        $recentActivity = AgentActivityLog::where('client_id', $client->id)
            ->latest()
            ->take(10)
            ->get()
            ->map(fn($log) => [
                'id'          => $log->id,
                'agent'       => $log->getAgentInfo(),
                'agent_slug'  => $log->agent_slug,
                'action'      => $log->action,
                'description' => $log->description,
                'status'      => $log->status,
                'created_at'  => $log->created_at->diffForHumans(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'workspace'       => $ws,
                'client'          => $this->formatClient($client),
                'recent_activity' => $recentActivity,
            ],
        ]);
    }

    // ── Formatage client ──────────────────────────────────────
    private function formatClient(Client $client, bool $detailed = false): array
    {
        $base = [
            'id'              => $client->id,
            'name'            => $client->name,
            'company_name'    => $client->company_name,
            'email'           => $client->email,
            'phone'           => $client->phone,
            'website'         => $client->website,
            'country'         => $client->country,
            'city'            => $client->city,
            'industry'        => $client->industry,
            'niche'           => $client->niche,
            'status'          => $client->status,
            'avatar'          => $client->avatar,
            'services'        => $client->services ?? [],
            'platforms'       => $client->platforms ?? [],
            'assigned_agents' => $client->assigned_agents ?? [],
            'monthly_retainer'=> $client->monthly_retainer,
            'currency'        => $client->currency,
            'contract_type'   => $client->contract_type,
            'contract_start'  => $client->contract_start?->format('Y-m-d'),
            'contract_end'    => $client->contract_end?->format('Y-m-d'),
            'notes'           => $client->notes,
            'workspace_id'    => $client->workspace?->id,
            'created_at'      => $client->created_at->toIso8601String(),
        ];

        if ($detailed) {
            $base['invoices'] = $client->invoices?->map(fn($inv) => [
                'id'             => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'total'          => $inv->total,
                'status'         => $inv->status,
                'due_date'       => $inv->due_date?->format('Y-m-d'),
            ])->toArray() ?? [];
            $base['activity'] = $client->activityLogs?->map(fn($log) => [
                'agent'       => $log->getAgentInfo(),
                'action'      => $log->action,
                'description' => $log->description,
                'status'      => $log->status,
                'created_at'  => $log->created_at->diffForHumans(),
            ])->toArray() ?? [];
        }

        return $base;
    }
}