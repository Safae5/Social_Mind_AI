<?php

namespace App\Services\Subscription;

use App\Models\Invoice;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Stripe\Checkout\Session;
use Stripe\Customer;
use Stripe\Exception\ApiErrorException;
use Stripe\Stripe;
use Stripe\Subscription as StripeSubscription;
use Stripe\WebhookSignature;

class StripeService
{
    public function __construct()
    {
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    // ══════════════════════════════════════════════════════════════
    // CLIENT STRIPE
    // ══════════════════════════════════════════════════════════════

    // ── Crée ou récupère un client Stripe ────────────────────────
    public function getOrCreateCustomer(User $user): string
    {
        if ($user->stripe_customer_id) {
            return $user->stripe_customer_id;
        }

        $customer = Customer::create([
            'email' => $user->email,
            'name'  => $user->full_name,
            'metadata' => [
                'user_id' => $user->id,
                'role'    => $user->role,
            ],
        ]);

        $user->update(['stripe_customer_id' => $customer->id]);

        return $customer->id;
    }

    // ══════════════════════════════════════════════════════════════
    // CHECKOUT SESSION
    // ══════════════════════════════════════════════════════════════

    // ── Crée une session de paiement Stripe Checkout ──────────────
    public function createCheckoutSession(
        User   $user,
        Plan   $plan,
        string $billingCycle, // 'monthly' | 'yearly'
        string $successUrl,
        string $cancelUrl
    ): Session {

        $customerId = $this->getOrCreateCustomer($user);

        // Sélectionne le bon Price ID Stripe selon le cycle
        $priceId = $billingCycle === 'yearly'
            ? $plan->stripe_price_id_yearly
            : $plan->stripe_price_id_monthly;

        if (!$priceId) {
            throw new \Exception(
                "Plan '{$plan->name}' n'a pas de Stripe Price ID configuré."
            );
        }

        $sessionData = [
            'customer'              => $customerId,
            'payment_method_types'  => ['card'],
            'mode'                  => 'subscription',
            'line_items'            => [[
                'price'    => $priceId,
                'quantity' => 1,
            ]],
            'success_url' => $successUrl . '?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url'  => $cancelUrl,
            'metadata'    => [
                'user_id'       => $user->id,
                'plan_id'       => $plan->id,
                'plan_slug'     => $plan->slug,
                'billing_cycle' => $billingCycle,
            ],
            'subscription_data' => [
                'metadata' => [
                    'user_id'   => $user->id,
                    'plan_slug' => $plan->slug,
                ],
            ],
            'allow_promotion_codes' => true,
        ];

        // Ajoute la période d'essai si le plan en a une
        if ($plan->has_trial && $plan->trial_days > 0) {
            $sessionData['subscription_data']['trial_period_days'] = $plan->trial_days;
        }

        return Session::create($sessionData);
    }

    // ── Récupère une session Checkout par ID ──────────────────────
    public function getCheckoutSession(string $sessionId): Session
    {
        return Session::retrieve($sessionId);
    }

    // ══════════════════════════════════════════════════════════════
    // PORTAIL CLIENT (gérer abonnement)
    // ══════════════════════════════════════════════════════════════

    public function createPortalSession(User $user, string $returnUrl): string
    {
        $customerId = $this->getOrCreateCustomer($user);

        $session = \Stripe\BillingPortal\Session::create([
            'customer'   => $customerId,
            'return_url' => $returnUrl,
        ]);

        return $session->url;
    }

    // ══════════════════════════════════════════════════════════════
    // GESTION DES ABONNEMENTS
    // ══════════════════════════════════════════════════════════════

    // ── Annule un abonnement (à la fin de la période) ─────────────
    public function cancelSubscription(
        string $stripeSubscriptionId,
        bool   $immediately = false
    ): StripeSubscription {

        $subscription = StripeSubscription::retrieve($stripeSubscriptionId);

        if ($immediately) {
            return $subscription->cancel();
        }

        // Annule à la fin de la période en cours
        return StripeSubscription::update($stripeSubscriptionId, [
            'cancel_at_period_end' => true,
        ]);
    }

    // ── Change de plan ────────────────────────────────────────────
    public function changePlan(
        string $stripeSubscriptionId,
        string $newPriceId
    ): StripeSubscription {

        $subscription = StripeSubscription::retrieve($stripeSubscriptionId);

        return StripeSubscription::update($stripeSubscriptionId, [
            'items' => [[
                'id'    => $subscription->items->data[0]->id,
                'price' => $newPriceId,
            ]],
            'proration_behavior' => 'always_invoice',
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    // REMBOURSEMENTS
    // ══════════════════════════════════════════════════════════════

    // ── Rembourse une facture Stripe payée (totalement ou partiellement) ──
    public function refundInvoice(string $stripeInvoiceId, ?int $amountCents = null): \Stripe\Refund
    {
        // Depuis l'API Stripe récente (SDK ^20.3), Invoice.payment_intent n'existe
        // plus — le paiement se trouve dans Invoice.payments (liste), chaque entrée
        // exposant payment.payment_intent. Vérifié empiriquement contre le compte
        // Stripe de ce projet (Phase 5).
        $invoice = \Stripe\Invoice::retrieve([
            'id'     => $stripeInvoiceId,
            'expand' => ['payments.data.payment'],
        ]);

        $paymentIntentId = $invoice->payments->data[0]->payment->payment_intent ?? null;
        if (!$paymentIntentId) {
            throw new \Exception('Cette facture Stripe n\'a pas de paiement associé (payment_intent manquant).');
        }

        $params = ['payment_intent' => $paymentIntentId];
        if ($amountCents !== null) {
            $params['amount'] = $amountCents;
        }

        return \Stripe\Refund::create($params);
    }

    // ══════════════════════════════════════════════════════════════
    // PROMOTIONS / RÉDUCTIONS
    // ══════════════════════════════════════════════════════════════

    // ── Cherche un code promo Stripe actif par son code visible ───
    public function findActivePromotionCode(string $code): ?\Stripe\PromotionCode
    {
        $result = \Stripe\PromotionCode::all(['code' => $code, 'active' => true, 'limit' => 1]);
        return $result->data[0] ?? null;
    }

    // ── Applique un code promo à un abonnement Stripe existant ────
    public function applyPromotionCode(string $stripeSubscriptionId, string $promotionCodeId): StripeSubscription
    {
        return StripeSubscription::update($stripeSubscriptionId, [
            'discounts' => [['promotion_code' => $promotionCodeId]],
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    // WEBHOOKS
    // ══════════════════════════════════════════════════════════════

    // ── Vérifie la signature du webhook ───────────────────────────
    public function verifyWebhookSignature(
        string $payload,
        string $signature
    ): \Stripe\Event {

        return \Stripe\Webhook::constructEvent(
            $payload,
            $signature,
            config('services.stripe.webhook_secret')
        );
    }

    // ══════════════════════════════════════════════════════════════
    // PRIX ET PRODUITS (pour seeder Stripe)
    // ══════════════════════════════════════════════════════════════

    public function createProduct(string $name): \Stripe\Product
    {
        return \Stripe\Product::create(['name' => $name]);
    }

    public function createPrice(
        string $productId,
        int    $amountCents,
        string $interval // 'month' | 'year'
    ): \Stripe\Price {

        return \Stripe\Price::create([
            'product'        => $productId,
            'unit_amount'    => $amountCents,
            'currency'       => 'usd',
            'recurring'      => ['interval' => $interval],
        ]);
    }
}