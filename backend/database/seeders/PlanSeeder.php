<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            // ── Plans Standard ────────────────────────────────────
            [
                'name'           => 'Essai Gratuit',
                'slug'           => 'free_trial',
                'type'           => 'standard',
                'price_monthly'  => 0,
                'price_yearly'   => 0,
                'has_trial'      => true,
                'trial_days'     => 30,
                'is_active'      => true,
                'sort_order'     => 0,
                'color'          => '#6B7280',
                'features'       => [
                    'smart_scheduler', 'caption_generator',
                    'hashtag_suggester',
                ],
                'limits'         => [
                    'posts_per_month'  => 5,
                    'ai_calls_per_day' => 10,
                    'social_accounts'  => 1,
                ],
            ],
            [
                'name'           => 'Normal Basic',
                'slug'           => 'normal_basic',
                'type'           => 'standard',
                'price_monthly'  => 9.99,
                'price_yearly'   => 95.90,
                'is_active'      => true,
                'sort_order'     => 1,
                'color'          => '#0F6E56',
                'features'       => [
                    'smart_scheduler', 'caption_generator',
                    'hashtag_suggester', 'auto_comment_responder',
                    'weekly_performance_summary',
                ],
                'limits'         => [
                    'posts_per_month'  => 30,
                    'ai_calls_per_day' => 50,
                    'social_accounts'  => 1,
                ],
            ],
            [
                'name'           => 'Normal Pro',
                'slug'           => 'normal_pro',
                'type'           => 'standard',
                'price_monthly'  => 19.99,
                'price_yearly'   => 191.90,
                'is_active'      => true,
                'is_featured'    => true,
                'sort_order'     => 2,
                'color'          => '#534AB7',
                'features'       => [
                    'smart_scheduler', 'caption_generator',
                    'hashtag_suggester', 'auto_comment_responder',
                    'weekly_performance_summary', 'ai_content_calendar',
                ],
                'limits'         => [
                    'posts_per_month'  => -1,  // illimité
                    'ai_calls_per_day' => 200,
                    'social_accounts'  => 2,
                ],
            ],

            // ── Plans Business ────────────────────────────────────
            [
                'name'           => 'Business Standard',
                'slug'           => 'business_standard',
                'type'           => 'business',
                'price_monthly'  => 99,
                'price_yearly'   => 950,
                'is_active'      => true,
                'sort_order'     => 3,
                'color'          => '#185FA5',
                'features'       => [
                    'account_manager_agent', 'social_manager_agent',
                    'content_strategist_agent', 'content_creator_agent',
                    'analytics_agent', 'client_billing',
                ],
                'limits'         => [
                    'clients'          => 5,
                    'ai_calls_per_day' => 500,
                    'social_accounts'  => 10,
                ],
            ],
            [
                'name'           => 'Business Premium',
                'slug'           => 'business_premium',
                'type'           => 'business',
                'price_monthly'  => 249,
                'price_yearly'   => 2390,
                'is_active'      => true,
                'is_featured'    => true,
                'sort_order'     => 4,
                'color'          => '#712B13',
                'features'       => [
                    'account_manager_agent', 'social_manager_agent',
                    'content_strategist_agent', 'content_creator_agent',
                    'analytics_agent', 'ads_optimizer_agent',
                    'competitor_intel_agent', 'client_billing',
                    'white_label_reports',
                ],
                'limits'         => [
                    'clients'          => -1,  // illimité
                    'ai_calls_per_day' => 2000,
                    'social_accounts'  => -1,
                ],
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['slug' => $plan['slug']], $plan);
        }

        $this->command->info('✅ Plans créés avec succès');
    }
}