<?php

namespace App\Services\Admin;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Subscription\StripeService;
use Illuminate\Http\Request;

class PlanManagementService
{
    public function __construct(
        private readonly StripeService $stripeService,
        private readonly AdminAuditLogService $auditLog,
    ) {}

    // Crée le plan localement, puis le Produit + Prix Stripe correspondants
    // (même schéma que database/seeders/StripeProductSeeder.php).
    public function create(User $admin, array $data, Request $request): Plan
    {
        $plan = Plan::create(array_merge($data, ['is_active' => true]));

        if (($plan->price_monthly ?? 0) > 0 || ($plan->price_yearly ?? 0) > 0) {
            $product = $this->stripeService->createProduct("Social Mind AI — {$plan->name}");
            $updates = ['stripe_product_id' => $product->id];

            if ($plan->price_monthly > 0) {
                $updates['stripe_price_id_monthly'] = $this->stripeService
                    ->createPrice($product->id, (int) round($plan->price_monthly * 100), 'month')->id;
            }
            if ($plan->price_yearly > 0) {
                $updates['stripe_price_id_yearly'] = $this->stripeService
                    ->createPrice($product->id, (int) round($plan->price_yearly * 100), 'year')->id;
            }
            $plan->update($updates);
        }

        $this->auditLog->log(
            admin: $admin, action: 'plan.created', targetType: 'Plan', targetId: $plan->id,
            after: $data, request: $request,
        );

        return $plan->fresh();
    }

    // Les Stripe Price sont immuables : si le prix change, on crée un NOUVEAU
    // Price côté Stripe et on met à jour la référence stockée — l'ancien Price
    // reste sur Stripe (inutilisé) plutôt que d'être supprimé, comportement standard.
    public function update(User $admin, Plan $plan, array $data, Request $request): Plan
    {
        $before = $plan->only(['name', 'description', 'price_monthly', 'price_yearly', 'features', 'limits']);

        $priceMonthlyChanged = array_key_exists('price_monthly', $data) && (float) $data['price_monthly'] !== (float) $plan->price_monthly;
        $priceYearlyChanged  = array_key_exists('price_yearly', $data)  && (float) $data['price_yearly']  !== (float) $plan->price_yearly;

        $plan->update($data);

        if ($plan->stripe_product_id) {
            if ($priceMonthlyChanged && $plan->price_monthly > 0) {
                $plan->update(['stripe_price_id_monthly' => $this->stripeService
                    ->createPrice($plan->stripe_product_id, (int) round($plan->price_monthly * 100), 'month')->id]);
            }
            if ($priceYearlyChanged && $plan->price_yearly > 0) {
                $plan->update(['stripe_price_id_yearly' => $this->stripeService
                    ->createPrice($plan->stripe_product_id, (int) round($plan->price_yearly * 100), 'year')->id]);
            }
        }

        $this->auditLog->log(
            admin: $admin, action: 'plan.updated', targetType: 'Plan', targetId: $plan->id,
            before: $before, after: $data, request: $request,
        );

        return $plan->fresh();
    }

    // Archive (is_active=false), jamais de suppression — plan_id FK est en
    // onDelete('restrict') de toute façon, donc un DELETE échouerait pour tout
    // plan ayant déjà eu un abonnement. On bloque aussi explicitement si des
    // abonnements sont ACTUELLEMENT actifs, par cohérence produit.
    public function archive(User $admin, Plan $plan, Request $request): Plan
    {
        $activeCount = Subscription::where('plan_id', $plan->id)
            ->whereIn('status', ['active', 'trialing'])
            ->count();

        if ($activeCount > 0) {
            throw new \Exception(
                "Impossible d'archiver ce plan : {$activeCount} abonnement(s) actif(s) ou en essai y sont encore rattachés.",
                400
            );
        }

        $plan->update(['is_active' => false]);

        $this->auditLog->log(
            admin: $admin, action: 'plan.archived', targetType: 'Plan', targetId: $plan->id,
            before: ['is_active' => true], after: ['is_active' => false], request: $request,
        );

        return $plan->fresh();
    }
}
