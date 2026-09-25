<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\User;
use App\Notifications\Subscription\PaymentFailedNotification;
use App\Services\Subscription\StripeService;
use App\Services\Subscription\SubscriptionService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Stripe\Event;

class WebhookController extends Controller
{
    public function __construct(
        private readonly StripeService       $stripeService,
        private readonly SubscriptionService $subscriptionService
    ) {}

    // ── POST /api/webhooks/stripe ─────────────────────────────────
    public function handleStripe(Request $request): Response
    {
        $payload   = $request->getContent();
        $signature = $request->header('Stripe-Signature');

        // Vérifie la signature du webhook
        try {
            $event = $this->stripeService->verifyWebhookSignature($payload, $signature);
        } catch (\Exception $e) {
            \Log::error('Stripe webhook signature invalid: ' . $e->getMessage());
            return response('Signature invalide.', 400);
        }

        // Traite l'événement
        try {
            match ($event->type) {
                'checkout.session.completed'       => $this->handleCheckoutCompleted($event),
                'customer.subscription.updated'    => $this->handleSubscriptionUpdated($event),
                'customer.subscription.deleted'    => $this->handleSubscriptionDeleted($event),
                'invoice.payment_succeeded'        => $this->handleInvoiceSucceeded($event),
                'invoice.payment_failed'           => $this->handleInvoiceFailed($event),
                default                            => null,
            };
        } catch (\Exception $e) {
            \Log::error("Stripe webhook error ({$event->type}): " . $e->getMessage());
            return response('Erreur serveur.', 500);
        }

        return response('Webhook traité.', 200);
    }

    // ── checkout.session.completed ────────────────────────────────
    // Déclenché quand un client complète le paiement
    private function handleCheckoutCompleted(Event $event): void
    {
        $session = $event->data->object;

        if ($session->mode !== 'subscription') return;

        $userId = $session->metadata->user_id ?? null;
        $planId = $session->metadata->plan_id ?? null;

        if (!$userId || !$planId) {
            \Log::error('Webhook checkout.completed: missing metadata');
            return;
        }

        $user = User::find($userId);
        $plan = Plan::find($planId);

        if (!$user || !$plan) {
            \Log::error("Webhook: User {$userId} or Plan {$planId} not found");
            return;
        }

        // Récupère les détails de l'abonnement Stripe
        $stripeSubscription = \Stripe\Subscription::retrieve($session->subscription);

        $this->subscriptionService->activateSubscription(
            user:                  $user,
            plan:                  $plan,
            stripeSubscriptionId:  $session->subscription,
            stripeCustomerId:      $session->customer,
            billingCycle:          $session->metadata->billing_cycle ?? 'monthly',
            periodData:            [
                'starts_at' => Carbon::createFromTimestamp($stripeSubscription->current_period_start),
                'ends_at'   => Carbon::createFromTimestamp($stripeSubscription->current_period_end),
            ]
        );

        \Log::info("Subscription activated for user {$userId}, plan {$plan->name}");
    }

    // ── customer.subscription.updated ────────────────────────────
    private function handleSubscriptionUpdated(Event $event): void
    {
        $stripeSub = $event->data->object;

        $subscription = \App\Models\Subscription::where(
            'stripe_subscription_id',
            $stripeSub->id
        )->first();

        if (!$subscription) return;

        $status = match ($stripeSub->status) {
            'active'   => 'active',
            'trialing' => 'trialing',
            'past_due' => 'past_due',
            'canceled' => 'canceled',
            default    => 'incomplete',
        };

        $subscription->update([
            'status'         => $status,
            'ends_at'        => Carbon::createFromTimestamp($stripeSub->current_period_end),
            'next_billing_at'=> Carbon::createFromTimestamp($stripeSub->current_period_end),
        ]);

        // Si annulé → met à jour le plan utilisateur
        if ($status === 'canceled') {
            $subscription->user?->update(['current_plan' => 'free_trial']);
        }
    }

    // ── customer.subscription.deleted ────────────────────────────
    private function handleSubscriptionDeleted(Event $event): void
    {
        $stripeSub = $event->data->object;

        $subscription = \App\Models\Subscription::where(
            'stripe_subscription_id',
            $stripeSub->id
        )->first();

        if (!$subscription) return;

        $subscription->update([
            'status'      => 'canceled',
            'canceled_at' => now(),
        ]);

        $subscription->user?->update(['current_plan' => 'free_trial']);
    }

    // ── invoice.payment_succeeded ─────────────────────────────────
    private function handleInvoiceSucceeded(Event $event): void
    {
        $invoice = $event->data->object;

        if ($invoice->billing_reason === 'subscription_create') return;

        $subscription = \App\Models\Subscription::where(
            'stripe_subscription_id',
            $invoice->subscription
        )->with('user', 'plan')->first();

        if (!$subscription) return;

        // Crée la facture dans notre base
        $this->subscriptionService->createInvoice(
            $subscription->user,
            $subscription,
            ['stripe_invoice_id' => $invoice->id]
        );

        \Log::info("Invoice created for subscription {$subscription->id}");
    }

    // ── invoice.payment_failed ────────────────────────────────────
    private function handleInvoiceFailed(Event $event): void
    {
        $invoice = $event->data->object;

        $subscription = \App\Models\Subscription::where(
            'stripe_subscription_id',
            $invoice->subscription
        )->with('user')->first();

        if (!$subscription) return;

        $subscription->update(['status' => 'past_due']);

        // Notifie l'utilisateur
        try {
            $subscription->user?->notify(new PaymentFailedNotification());
        } catch (\Exception $e) {
            \Log::error('Payment failed notification error: ' . $e->getMessage());
        }
    }
}