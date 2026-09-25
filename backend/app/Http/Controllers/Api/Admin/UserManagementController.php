<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BanUserRequest;
use App\Http\Requests\Admin\ChangeRoleRequest;
use App\Http\Requests\Admin\SuspendUserRequest;
use App\Models\AdminAuditLog;
use App\Models\AgentActivityLog;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Admin\UserManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserManagementController extends Controller
{
    public function __construct(
        private readonly UserManagementService $service,
    ) {}

    // ══════════════════════════════════════════════════════════
    // GET /api/admin/users
    // Liste paginée côté serveur, filtrable, triable, recherchable.
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->select(['id', 'first_name', 'last_name', 'email', 'role', 'status',
                      'current_plan', 'created_at', 'last_login_at']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($role = $request->query('role')) {
            $query->where('role', $role);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($plan = $request->query('plan')) {
            $query->where('current_plan', $plan);
        }

        if ($from = $request->query('date_from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->query('date_to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        $sortBy  = in_array($request->query('sort_by'), ['created_at', 'last_login_at', 'email', 'role', 'status'])
            ? $request->query('sort_by') : 'created_at';
        $sortDir = $request->query('sort_dir') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        $perPage = min(100, max(10, (int) $request->query('per_page', 20)));
        $users   = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => [
                'users' => collect($users->items())->map(fn($u) => [
                    'id'             => $u->id,
                    'full_name'      => $u->full_name,
                    'email'          => $u->email,
                    'role'           => $u->role,
                    'status'         => $u->status,
                    'current_plan'   => $u->current_plan,
                    'created_at'     => $u->created_at?->toIso8601String(),
                    'last_login_at'  => $u->last_login_at?->toIso8601String(),
                ]),
                'pagination' => [
                    'current_page' => $users->currentPage(),
                    'last_page'    => $users->lastPage(),
                    'per_page'     => $users->perPage(),
                    'total'        => $users->total(),
                ],
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/admin/users/{id}
    // ══════════════════════════════════════════════════════════

    public function show(Request $request, int $id): JsonResponse
    {
        $user = User::with(['activeSubscription.plan'])->findOrFail($id);

        $usageStats = AgentActivityLog::where('user_id', $user->id)
            ->selectRaw('agent_slug, count(*) as total, sum(case when status = "success" then 1 else 0 end) as successful')
            ->groupBy('agent_slug')
            ->get();

        $socialAccounts = $user->socialAccounts()
            ->get(['id', 'platform', 'platform_username', 'is_active', 'token_valid', 'created_at']);

        $loginHistory = UserSession::where('user_id', $user->id)
            ->orderByDesc('last_active_at')
            ->take(10)
            ->get(['id', 'device_type', 'device_name', 'browser', 'os', 'ip_address', 'location', 'last_active_at']);

        $adminHistory = AdminAuditLog::where('target_type', 'User')
            ->where('target_id', $user->id)
            ->with('admin:id,first_name,last_name,email')
            ->orderByDesc('created_at')
            ->take(20)
            ->get(['id', 'admin_id', 'action', 'before', 'after', 'created_at']);

        return response()->json([
            'success' => true,
            'data'    => [
                'user' => [
                    'id'                => $user->id,
                    'full_name'         => $user->full_name,
                    'email'             => $user->email,
                    'phone'             => $user->phone,
                    'role'              => $user->role,
                    'status'            => $user->status,
                    'email_verified'    => $user->isEmailVerified(),
                    'two_factor_enabled'=> $user->hasTwoFactorEnabled(),
                    'created_at'        => $user->created_at?->toIso8601String(),
                    'last_login_at'     => $user->last_login_at?->toIso8601String(),
                    'last_login_ip'     => $user->last_login_ip,
                    'login_count'       => $user->login_count,
                ],
                'subscription' => $user->activeSubscription ? [
                    'plan'      => $user->activeSubscription->plan?->name,
                    'status'    => $user->activeSubscription->status,
                    'ends_at'   => $user->activeSubscription->ends_at?->toIso8601String(),
                    'auto_renew'=> $user->activeSubscription->auto_renew,
                ] : null,
                'usage_stats'      => $usageStats,
                'social_accounts'  => $socialAccounts,
                'login_history'    => $loginHistory,
                'admin_history'    => $adminHistory->map(fn($l) => [
                    'id'         => $l->id,
                    'admin'      => $l->admin?->full_name,
                    'action'     => $l->action,
                    'before'     => $l->before,
                    'after'      => $l->after,
                    'created_at' => $l->created_at?->toIso8601String(),
                ]),
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // Actions
    // ══════════════════════════════════════════════════════════

    public function changeRole(ChangeRoleRequest $request, int $id): JsonResponse
    {
        return $this->handleAction(fn($admin, $target) =>
            $this->service->changeRole($admin, $target, $request->validated('role'), $request)
        , $id, $request);
    }

    public function suspend(SuspendUserRequest $request, int $id): JsonResponse
    {
        return $this->handleAction(fn($admin, $target) =>
            $this->service->suspend($admin, $target, $request->validated('reason'), $request)
        , $id, $request);
    }

    public function unsuspend(Request $request, int $id): JsonResponse
    {
        return $this->handleAction(fn($admin, $target) =>
            $this->service->unsuspend($admin, $target, $request)
        , $id, $request);
    }

    public function ban(BanUserRequest $request, int $id): JsonResponse
    {
        return $this->handleAction(fn($admin, $target) =>
            $this->service->ban($admin, $target, $request->validated('reason'), $request)
        , $id, $request);
    }

    public function triggerPasswordReset(Request $request, int $id): JsonResponse
    {
        $admin  = $request->user();
        $target = User::findOrFail($id);

        try {
            $this->service->triggerPasswordReset($admin, $target, $request);
            return response()->json(['success' => true, 'message' => 'E-mail de réinitialisation envoyé.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    public function requestDeletion(Request $request, int $id): JsonResponse
    {
        $admin  = $request->user();
        $target = User::findOrFail($id);

        try {
            $gdprRequest = $this->service->requestGdprDeletion($admin, $target, $request);
            return response()->json([
                'success' => true,
                'message' => 'Demande de suppression RGPD enregistrée — traitement en arrière-plan.',
                'data'    => ['gdpr_request_id' => $gdprRequest->id],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    // ── Helper commun : résout target + gère les exceptions métier ──
    private function handleAction(callable $action, int $id, Request $request): JsonResponse
    {
        $admin  = $request->user();
        $target = User::findOrFail($id);

        try {
            $updated = $action($admin, $target);
            return response()->json(['success' => true, 'data' => ['user' => $updated]]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }
}
