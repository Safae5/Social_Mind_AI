<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Services\Subscription\StripeService;
use Illuminate\Database\Seeder;
use Stripe\Stripe;

class StripeProductSeeder extends Seeder
{
    public function run(): void
    {
        Stripe::setApiKey(config('services.stripe.secret'));

        $plans = Plan::whereIn('slug', [
            'normal_basic', 'normal_pro',
            'business_standard', 'business_premium'
        ])->get();

        foreach ($plans as $plan) {
            $this->command->info("Création du produit Stripe pour : {$plan->name}");

            // Crée le produit Stripe
            $product = \Stripe\Product::create([
                'name'     => "Social Mind AI — {$plan->name}",
                'metadata' => ['plan_slug' => $plan->slug],
            ]);

            $updates = ['stripe_product_id' => $product->id];

            // Crée le prix mensuel
            if ($plan->price_monthly > 0) {
                $monthlyPrice = \Stripe\Price::create([
                    'product'     => $product->id,
                    'unit_amount' => (int) ($plan->price_monthly * 100),
                    'currency'    => 'usd',
                    'recurring'   => ['interval' => 'month'],
                    'nickname'    => "{$plan->name} — Mensuel",
                ]);
                $updates['stripe_price_id_monthly'] = $monthlyPrice->id;
                $this->command->line("  ✅ Prix mensuel : {$monthlyPrice->id}");
            }

            // Crée le prix annuel
            if ($plan->price_yearly > 0) {
                $yearlyPrice = \Stripe\Price::create([
                    'product'     => $product->id,
                    'unit_amount' => (int) ($plan->price_yearly * 100),
                    'currency'    => 'usd',
                    'recurring'   => ['interval' => 'year'],
                    'nickname'    => "{$plan->name} — Annuel",
                ]);
                $updates['stripe_price_id_yearly'] = $yearlyPrice->id;
                $this->command->line("  ✅ Prix annuel : {$yearlyPrice->id}");
            }

            $plan->update($updates);
            $this->command->info("  ✅ Plan mis à jour en base de données\n");
        }

        $this->command->info('🎉 Tous les produits Stripe créés avec succès !');
    }
}