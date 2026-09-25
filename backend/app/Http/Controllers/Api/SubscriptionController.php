<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Services\Subscription\StripeService;
use App\Services\Subscription\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function __construct(
        private readonly StripeService       $stripeService,
        private readonly SubscriptionService $subscriptionService
    ) {}

    // ── GET /api/plans ─────────────────────────────────────────────
    public function plans(): JsonResponse
    {
        $plans = Plan::active()
            ->orderBy('sort_order')
            ->get()
            ->map(fn($plan) => [
                'id'             => $plan->id,
                'name'           => $plan->name,
                'slug'           => $plan->slug,
                'description'    => $plan->description,
                'type'           => $plan->type,
                'price_monthly'  => $plan->price_monthly,
                'price_yearly'   => $plan->price_yearly,
                'currency'       => $plan->currency,
                'features'       => $plan->features ?? [],
                'limits'         => $plan->limits ?? [],
                'has_trial'      => $plan->has_trial,
                'trial_days'     => $plan->trial_days,
                'is_featured'    => $plan->is_featured,
                'color'          => $plan->color,
            ]);

        return response()->json([
            'success' => true,
            'data'    => ['plans' => $plans],
        ]);
    }

    // ── GET /api/subscription ──────────────────────────────────────
    public function current(Request $request): JsonResponse
    {
        $user         = $request->user();
        $subscription = $user->activeSubscription?->load('plan');

        return response()->json([
            'success' => true,
            'data'    => [
                'subscription' => $subscription ? [
                    'id'             => $subscription->id,
                    'status'         => $subscription->status,
                    'plan'           => [
                        'name'    => $subscription->plan->name,
                        'slug'    => $subscription->plan->slug,
                        'type'    => $subscription->plan->type,
                        'features'=> $subscription->plan->features,
                    ],
                    'billing_cycle'  => $subscription->billing_cycle,
                    'starts_at'      => $subscription->starts_at?->toIso8601String(),
                    'ends_at'        => $subscription->ends_at?->toIso8601String(),
                    'days_remaining' => $subscription->daysRemaining(),
                    'auto_renew'     => $subscription->auto_renew,
                    'is_trialing'    => $subscription->isTrialing(),
                    'is_valid'       => $subscription->isValid(),
                    'next_billing_at'    => $subscription->next_billing_at?->toIso8601String(),
                    'next_billing_amount'=> $subscription->next_billing_amount,
                ] : null,
            ],
        ]);
    }

    // ── POST /api/subscription/checkout ───────────────────────────
    public function checkout(Request $request): JsonResponse
    {
        $request->validate([
            'plan_slug'     => ['required', 'string', 'exists:plans,slug'],
            'billing_cycle' => ['required', 'in:monthly,yearly'],
        ]);

        $user = $request->user();
        $plan = Plan::where('slug', $request->plan_slug)->firstOrFail();

        // Vérifie que le plan correspond au rôle de l'utilisateur
        if ($plan->type !== $user->role && !$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Ce plan n\'est pas compatible avec votre type de compte.',
            ], 400);
        }

        try {
            $session = $this->stripeService->createCheckoutSession(
                $user,
                $plan,
                $request->billing_cycle,
                config('app.frontend_url') . '/subscription/success',
                config('app.frontend_url') . '/upgrade'
            );

            return response()->json([
                'success' => true,
                'data'    => [
                    'checkout_url' => $session->url,
                    'session_id'   => $session->id,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // ── POST /api/subscription/portal ─────────────────────────────
    // Redirige vers le portail Stripe pour gérer l'abonnement
    public function portal(Request $request): JsonResponse
    {
        try {
            $portalUrl = $this->stripeService->createPortalSession(
                $request->user(),
                config('app.frontend_url') . '/subscription'
            );

            return response()->json([
                'success' => true,
                'data'    => ['portal_url' => $portalUrl],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible d\'accéder au portail de facturation.',
            ], 500);
        }
    }

    // ── POST /api/subscription/cancel ─────────────────────────────
    public function cancel(Request $request): JsonResponse
    {
        $request->validate([
            'reason'   => ['nullable', 'string', 'max:255'],
            'feedback' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $user         = $request->user();
            $subscription = $user->activeSubscription;

            // Annule aussi chez Stripe
            if ($subscription?->stripe_subscription_id) {
                $this->stripeService->cancelSubscription(
                    $subscription->stripe_subscription_id
                );
            }

            $this->subscriptionService->cancelSubscription(
                $user,
                $request->reason ?? '',
                $request->feedback ?? ''
            );

            return response()->json([
                'success' => true,
                'message' => 'Abonnement annulé. Vous conservez l\'accès jusqu\'à la fin de la période.',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getCode() ?: 500);
        }
    }

    // ── GET /api/subscription/invoices ────────────────────────────
    public function invoices(Request $request): JsonResponse
    {
        $invoices = $request->user()
            ->invoices()
            ->with('subscription.plan')
            ->orderByDesc('issued_at')
            ->get()
            ->map(fn($inv) => [
                'id'             => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'total'          => $inv->total,
                'currency'       => $inv->currency,
                'status'         => $inv->status,
                'issued_at'      => $inv->issued_at->toIso8601String(),
                'paid_at'        => $inv->paid_at?->toIso8601String(),
                'plan_name'      => $inv->subscription?->plan?->name,
            ]);

        return response()->json([
            'success' => true,
            'data'    => ['invoices' => $invoices],
        ]);
    }

    // ── GET /api/subscription/success ─────────────────────────────
    // Confirme le succès après redirection depuis Stripe
    public function success(Request $request): JsonResponse
    {
        $request->validate([
            'session_id' => ['required', 'string'],
        ]);

        try {
            $session = $this->stripeService->getCheckoutSession($request->session_id);

            if ($session->payment_status !== 'paid' && $session->status !== 'complete') {
                return response()->json([
                    'success' => false,
                    'message' => 'Le paiement n\'est pas encore confirmé.',
                ], 400);
            }

            $user = $request->user();
            $user->load('activeSubscription.plan');

            return response()->json([
                'success' => true,
                'message' => 'Abonnement activé avec succès !',
                'data'    => [
                    'plan_name'     => $user->activeSubscription?->plan?->name,
                    'current_plan'  => $user->current_plan,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}