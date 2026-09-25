<?php

namespace App\Services\Admin;

use App\Models\Invoice;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Subscription\StripeService;
use Illuminate\Http\Request;

class SubscriptionManagementService
{
    public function __construct(
        private readonly StripeService $stripeService,
        private readonly AdminAuditLogService $auditLog,
    ) {}

    // ══════════════════════════════════════════════════════════
    // Changement de plan manuel (8.2)
    //
    // Source de vérité :
    //   - Abonnement Stripe réel (stripe_subscription_id présent) → on modifie
    //     RÉELLEMENT l'abonnement Stripe (proration incluse) puis on synchronise
    //     la ligne locale. Stripe reste la référence, pas de divergence possible :
    //     les webhooks existants (matchés par stripe_subscription_id) continueront
    //     de la tenir à jour normalement.
    //   - Pas d'abonnement Stripe (free_trial / jamais payé) → on crée un
    //     abonnement 100% local ('source' = admin_manual, stripe_subscription_id
    //     = null), sans passer par un paiement Stripe — exactement ce que
    //     demande la section 8.2. Un tel abonnement est invisible pour les
    //     webhooks Stripe (ils ne matchent que par stripe_subscription_id) donc
    //     ne peut jamais entrer en conflit avec un futur abonnement Stripe réel.
    // ══════════════════════════════════════════════════════════

    public function changePlan(User $admin, User $target, Plan $newPlan, string $billingCycle, Request $request): Subscription
    {
        $current = $target->activeSubscription;
        $before  = $current ? [
            'plan'          => $current->plan?->slug,
            'status'        => $current->status,
            'billing_cycle' => $current->billing_cycle,
            'source'        => $current->source,
        ] : null;

        if ($current && $current->stripe_subscription_id) {
            $priceId = $billingCycle === 'yearly'
                ? $newPlan->stripe_price_id_yearly
                : $newPlan->stripe_price_id_monthly;

            if (!$priceId) {
                throw new \Exception(
                    "Le plan '{$newPlan->name}' n'a pas de Stripe Price ID configuré pour le cycle {$billingCycle}.",
                    400
                );
            }

            $this->stripeService->changePlan($current->stripe_subscription_id, $priceId);

            $current->update([
                'plan_id'       => $newPlan->id,
                'billing_cycle' => $billingCycle,
            ]);
            $updated = $current->fresh();

        } else {
            if ($current) {
                $current->update(['status' => 'canceled', 'canceled_at' => now(), 'auto_renew' => false]);
            }

            $updated = Subscription::create([
                'user_id'                => $target->id,
                'plan_id'                => $newPlan->id,
                'stripe_subscription_id' => null,
                'stripe_customer_id'     => $target->stripe_customer_id,
                'source'                 => 'admin_manual',
                'granted_by'             => $admin->id,
                'billing_cycle'          => $billingCycle,
                'status'                 => 'active',
                'starts_at'              => now(),
                'ends_at'                => $billingCycle === 'yearly' ? now()->addYear() : now()->addMonth(),
                'auto_renew'             => false,
                'next_billing_amount'    => $billingCycle === 'yearly' ? $newPlan->price_yearly : $newPlan->price_monthly,
            ]);
        }

        $target->update(['current_plan' => $newPlan->slug]);

        $this->auditLog->log(
            admin: $admin,
            action: 'subscription.plan_changed',
            targetType: 'User',
            targetId: $target->id,
            before: $before,
            after: ['plan' => $newPlan->slug, 'billing_cycle' => $billingCycle, 'source' => $updated->source],
            request: $request,
        );

        return $updated->load('plan');
    }

    // ══════════════════════════════════════════════════════════
    // Codes promo (8.3) — concept purement Stripe, ne s'applique
    // qu'aux abonnements réellement facturés via Stripe.
    // ══════════════════════════════════════════════════════════

    public function applyPromotion(User $admin, User $target, string $promoCode, Request $request): void
    {
        $subscription = $target->activeSubscription;

        if (!$subscription || !$subscription->stripe_subscription_id) {
            throw new \Exception(
                'Cet utilisateur n\'a pas d\'abonnement Stripe actif — les codes promo ne s\'appliquent qu\'aux abonnements facturés réellement (pas aux abonnements accordés manuellement).',
                400
            );
        }

        $promo = $this->stripeService->findActivePromotionCode($promoCode);
        if (!$promo) {
            throw new \Exception('Code promo invalide, expiré ou inactif.', 404);
        }

        $this->stripeService->applyPromotionCode($subscription->stripe_subscription_id, $promo->id);

        $this->auditLog->log(
            admin: $admin,
            action: 'subscription.promotion_applied',
            targetType: 'User',
            targetId: $target->id,
            after: ['promotion_code' => $promoCode],
            request: $request,
        );
    }

    // ══════════════════════════════════════════════════════════
    // Remboursements Stripe (8.4)
    // ══════════════════════════════════════════════════════════

    public function issueRefund(User $admin, User $target, Invoice $invoice, ?float $amount, Request $request): Invoice
    {
        if ($invoice->user_id !== $target->id) {
            throw new \Exception('Cette facture n\'appartient pas à cet utilisateur.', 400);
        }

        if (!$invoice->isRefundable()) {
            throw new \Exception(
                $invoice->isRefunded()
                    ? 'Cette facture a déjà été remboursée.'
                    : 'Cette facture n\'est pas remboursable (statut ou origine invalide — les abonnements accordés manuellement n\'ont pas de facture Stripe réelle).',
                400
            );
        }

        $amountCents = $amount !== null ? (int) round($amount * 100) : null;
        $refund = $this->stripeService->refundInvoice($invoice->stripe_invoice_id, $amountCents);

        $invoice->update([
            'refunded_at'   => now(),
            'refund_amount' => $amount ?? (float) $invoice->total,
            'refunded_by'   => $admin->id,
        ]);

        $this->auditLog->log(
            admin: $admin,
            action: 'subscription.refund_issued',
            targetType: 'Invoice',
            targetId: $invoice->id,
            after: ['amount' => $amount ?? (float) $invoice->total, 'stripe_refund_id' => $refund->id],
            request: $request,
        );

        return $invoice->fresh();
    }
}
