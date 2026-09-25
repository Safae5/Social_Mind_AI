<?php

namespace App\Services\Subscription;

use App\Models\Invoice;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Notifications\Subscription\SubscriptionActivatedNotification;
use App\Notifications\Subscription\SubscriptionCanceledNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SubscriptionService
{
    // ── Génère un numéro de facture unique ────────────────────────
    private function generateInvoiceNumber(): string
    {
        $year = now()->year;

        $sequence = DB::table('invoice_sequences')
            ->where('year', $year)
            ->first();

        if ($sequence) {
            DB::table('invoice_sequences')
                ->where('year', $year)
                ->increment('last_number');
            $number = $sequence->last_number + 1;
        } else {
            DB::table('invoice_sequences')->insert([
                'year'        => $year,
                'last_number' => 1,
            ]);
            $number = 1;
        }

        return 'SMI-' . $year . '-' . str_pad($number, 4, '0', STR_PAD_LEFT);
    }

    // ── Active ou met à jour l'abonnement après paiement ─────────
    public function activateSubscription(
        User   $user,
        Plan   $plan,
        string $stripeSubscriptionId,
        string $stripeCustomerId,
        string $billingCycle,
        array  $periodData
    ): Subscription {

        // Annule les abonnements actifs précédents
        Subscription::where('user_id', $user->id)
            ->whereIn('status', ['active', 'trialing'])
            ->update([
                'status'      => 'canceled',
                'canceled_at' => now(),
            ]);

        // Crée le nouvel abonnement
        $subscription = Subscription::create([
            'user_id'                => $user->id,
            'plan_id'                => $plan->id,
            'stripe_subscription_id' => $stripeSubscriptionId,
            'stripe_customer_id'     => $stripeCustomerId,
            'billing_cycle'          => $billingCycle,
            'status'                 => 'active',
            'starts_at'              => $periodData['starts_at'],
            'ends_at'                => $periodData['ends_at'],
            'next_billing_at'        => $periodData['ends_at'],
            'next_billing_amount'    => $billingCycle === 'yearly'
                ? $plan->price_yearly
                : $plan->price_monthly,
            'auto_renew'             => true,
        ]);

        // Met à jour le plan courant de l'utilisateur
        $user->update([
            'current_plan'       => $plan->slug,
            'stripe_customer_id' => $stripeCustomerId,
        ]);

        // Notifie l'utilisateur
        try {
            $user->notify(new SubscriptionActivatedNotification($plan->name, $subscription->ends_at));
        } catch (\Exception $e) {
            \Log::error('Notification failed: ' . $e->getMessage());
        }

        return $subscription;
    }

    // ── Crée une facture ──────────────────────────────────────────
    public function createInvoice(
        User         $user,
        Subscription $subscription,
        array        $data
    ): Invoice {

        $amount = $subscription->billing_cycle === 'yearly'
            ? $subscription->plan->price_yearly
            : $subscription->plan->price_monthly;

        return Invoice::create([
            'user_id'           => $user->id,
            'subscription_id'   => $subscription->id,
            'invoice_number'    => $this->generateInvoiceNumber(),
            'stripe_invoice_id' => $data['stripe_invoice_id'] ?? null,
            'subtotal'          => $amount,
            'tax'               => 0,
            'total'             => $amount,
            'currency'          => 'USD',
            'status'            => 'paid',
            'issued_at'         => now(),
            'paid_at'           => now(),
            'line_items'        => [[
                'description' => $subscription->plan->name . ' — ' .
                    ($subscription->billing_cycle === 'yearly' ? 'Annuel' : 'Mensuel'),
                'amount'      => $amount,
                'currency'    => 'USD',
            ]],
        ]);
    }

    // ── Annule l'abonnement ───────────────────────────────────────
    public function cancelSubscription(
        User   $user,
        string $reason = '',
        string $feedback = ''
    ): Subscription {

        $subscription = $user->activeSubscription;

        if (!$subscription) {
            throw new \Exception('Aucun abonnement actif trouvé.', 404);
        }

        $subscription->update([
            'status'          => 'canceled',
            'canceled_at'     => now(),
            'cancel_reason'   => $reason,
            'cancel_feedback' => $feedback,
            'auto_renew'      => false,
        ]);

        $user->update(['current_plan' => 'free_trial']);

        try {
            $user->notify(new SubscriptionCanceledNotification($subscription->ends_at));
        } catch (\Exception $e) {
            \Log::error('Notification failed: ' . $e->getMessage());
        }

        return $subscription;
    }

    // ── Vérifie si l'utilisateur peut accéder à une feature ───────
    public function canAccess(User $user, string $feature): bool
    {
        if ($user->isAdmin()) return true;

        $subscription = $user->activeSubscription;
        if (!$subscription || !$subscription->isValid()) return false;

        return $subscription->plan->hasFeature($feature);
    }

    // ── Vérifie une limite ────────────────────────────────────────
    public function getLimit(User $user, string $limitKey): int
    {
        if ($user->isAdmin()) return -1; // illimité

        $subscription = $user->activeSubscription;
        if (!$subscription) return 0;

        return $subscription->plan->getLimit($limitKey, 0);
    }
}