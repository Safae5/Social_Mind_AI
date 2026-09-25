<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ApplyPromotionRequest;
use App\Http\Requests\Admin\ChangePlanRequest;
use App\Http\Requests\Admin\RefundRequest;
use App\Models\Invoice;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Admin\SubscriptionManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionManagementController extends Controller
{
    public function __construct(
        private readonly SubscriptionManagementService $service,
    ) {}

    // ══════════════════════════════════════════════════════════
    // GET /api/admin/subscriptions — 8.1
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        $query = Subscription::query()->with(['user:id,first_name,last_name,email', 'plan:id,name,slug,type']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($planId = $request->query('plan_id')) {
            $query->where('plan_id', $planId);
        }
        if ($from = $request->query('date_from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('date_to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        $perPage = min(100, max(10, (int) $request->query('per_page', 20)));
        $subs    = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => [
                'subscriptions' => collect($subs->items())->map(fn($s) => [
                    'id'                 => $s->id,
                    'user'               => $s->user ? ['id' => $s->user->id, 'name' => $s->user->full_name, 'email' => $s->user->email] : null,
                    'plan'               => $s->plan?->name,
                    'plan_slug'          => $s->plan?->slug,
                    'status'             => $s->status,
                    'source'             => $s->source,
                    'billing_cycle'      => $s->billing_cycle,
                    'is_trialing'        => $s->isTrialing(),
                    'trial_ends_at'      => $s->trial_ends_at?->toIso8601String(),
                    'starts_at'          => $s->starts_at?->toIso8601String(),
                    'ends_at'            => $s->ends_at?->toIso8601String(),
                    'next_billing_at'    => $s->next_billing_at?->toIso8601String(),
                    'next_billing_amount'=> $s->next_billing_amount,
                    'auto_renew'         => $s->auto_renew,
                    'created_at'         => $s->created_at?->toIso8601String(),
                ]),
                'pagination' => [
                    'current_page' => $subs->currentPage(),
                    'last_page'    => $subs->lastPage(),
                    'per_page'     => $subs->perPage(),
                    'total'        => $subs->total(),
                ],
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/admin/users/{id}/subscription/change-plan — 8.2
    // ══════════════════════════════════════════════════════════

    public function changePlan(ChangePlanRequest $request, int $userId): JsonResponse
    {
        $admin  = $request->user();
        $target = User::findOrFail($userId);
        $plan   = Plan::where('slug', $request->validated('plan_slug'))->firstOrFail();

        try {
            $subscription = $this->service->changePlan($admin, $target, $plan, $request->validated('billing_cycle'), $request);
            return response()->json(['success' => true, 'data' => ['subscription' => $subscription]]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/admin/users/{id}/subscription/promotion — 8.3
    // ══════════════════════════════════════════════════════════

    public function applyPromotion(ApplyPromotionRequest $request, int $userId): JsonResponse
    {
        $admin  = $request->user();
        $target = User::findOrFail($userId);

        try {
            $this->service->applyPromotion($admin, $target, $request->validated('promotion_code'), $request);
            return response()->json(['success' => true, 'message' => 'Code promo appliqué.']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/admin/invoices/{id}/refund — 8.4
    // ══════════════════════════════════════════════════════════

    public function refund(RefundRequest $request, int $invoiceId): JsonResponse
    {
        $admin   = $request->user();
        $invoice = Invoice::findOrFail($invoiceId);
        $target  = User::findOrFail($invoice->user_id);

        try {
            $updated = $this->service->issueRefund($admin, $target, $invoice, $request->validated('amount'), $request);
            return response()->json(['success' => true, 'data' => ['invoice' => $updated]]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/admin/subscriptions/metrics — 8.6
    //
    // Formules (documentées ici, pas ailleurs) :
    //   MRR = Σ next_billing_amount des abonnements status='active'
    //         normalisé au mois (÷12 si billing_cycle='yearly').
    //         Les essais ('trialing') sont exclus : aucun revenu encaissé.
    //   ARR = MRR × 12.
    //   Churn (30j) = (annulés dans les 30 derniers jours)
    //                 ÷ (abonnements existants au début de la fenêtre de 30j).
    //                 Retourne null si le dénominateur est 0 (pas de division
    //                 par zéro, pas de valeur inventée).
    //   Conversion essai→payant = NON CALCULABLE avec les données actuelles :
    //         la table subscriptions ne garde que le statut COURANT, pas
    //         l'historique des transitions — impossible de savoir combien
    //         d'essais ont un jour existé puis converti. Retourne null avec
    //         une explication plutôt qu'une valeur fabriquée.
    //   Revenu par plan = Σ invoices.total (status='paid') groupé par plan,
    //         sur la période demandée (date_from/date_to, défaut 30 derniers jours).
    // ══════════════════════════════════════════════════════════

    public function metrics(Request $request): JsonResponse
    {
        $activeSubs = Subscription::where('status', 'active')->get(['billing_cycle', 'next_billing_amount']);
        $mrr = $activeSubs->sum(fn($s) => $s->billing_cycle === 'yearly'
            ? (float) ($s->next_billing_amount ?? 0) / 12
            : (float) ($s->next_billing_amount ?? 0));
        $arr = $mrr * 12;

        $windowStart = now()->subDays(30);
        $canceledInWindow = Subscription::where('canceled_at', '>=', $windowStart)->count();
        $activeAtWindowStart = Subscription::where('created_at', '<', $windowStart)
            ->where(function ($q) use ($windowStart) {
                $q->whereNull('canceled_at')->orWhere('canceled_at', '>=', $windowStart);
            })
            ->count();
        $churnRate30d = $activeAtWindowStart > 0 ? round($canceledInWindow / $activeAtWindowStart * 100, 2) : null;

        $from = $request->query('date_from', now()->subDays(30)->toDateString());
        $to   = $request->query('date_to', now()->toDateString());

        $revenueByPlan = Invoice::query()
            ->join('subscriptions', 'invoices.subscription_id', '=', 'subscriptions.id')
            ->join('plans', 'subscriptions.plan_id', '=', 'plans.id')
            ->where('invoices.status', 'paid')
            ->whereDate('invoices.issued_at', '>=', $from)
            ->whereDate('invoices.issued_at', '<=', $to)
            ->selectRaw('plans.name as plan_name, plans.slug as plan_slug, sum(invoices.total) as revenue, count(*) as invoice_count')
            ->groupBy('plans.name', 'plans.slug')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'mrr' => round($mrr, 2),
                'arr' => round($arr, 2),
                'churn_rate_30d_pct' => $churnRate30d,
                'churn_rate_30d_note' => $churnRate30d === null
                    ? 'Pas assez de données : aucun abonnement n\'existait avant le début de la fenêtre de 30 jours.'
                    : null,
                'trial_to_paid_conversion_pct' => null,
                'trial_to_paid_conversion_note' => 'Non calculable — l\'historique des transitions de statut (trialing → active) n\'est pas conservé, seul le statut courant est stocké.',
                'revenue_by_plan' => $revenueByPlan,
                'revenue_period'  => ['from' => $from, 'to' => $to],
                'total_invoices'  => Invoice::count(),
            ],
        ]);
    }
}
