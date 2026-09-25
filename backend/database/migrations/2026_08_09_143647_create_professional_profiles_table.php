<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('professional_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // ── Informations professionnelles ─────────────────
            $table->string('agency_name')->nullable();
            $table->string('professional_phone')->nullable();
            $table->string('website')->nullable();
            $table->integer('founded_year')->nullable();
            $table->enum('activity_type', [
                'smma_agency',
                'freelance_marketer',
                'marketing_consultant',
                'community_manager',
                'marketing_team',
                'other',
            ])->nullable();
            $table->integer('team_size')->nullable();
            $table->integer('current_clients_count')->nullable();
            $table->integer('avg_simultaneous_clients')->nullable();
            $table->integer('active_projects')->nullable();
            $table->integer('years_experience')->nullable();

            // ── Expertise marketing ────────────────────────────
            $table->json('expertise_domains')->nullable();
            $table->json('platforms_mastered')->nullable();
            $table->json('tools_used')->nullable();
            $table->json('certifications')->nullable();
            $table->decimal('avg_monthly_ad_budget', 12, 2)->nullable();
            $table->integer('campaigns_managed_count')->nullable();

            // ── Niches ────────────────────────────────────────
            $table->json('niches')->nullable();
            $table->json('niche_details')->nullable();

            // ── Performance (déclarée) ─────────────────────────
            $table->decimal('avg_roas', 8, 2)->nullable();
            $table->decimal('avg_engagement_rate', 5, 2)->nullable();
            $table->decimal('avg_follower_growth', 5, 2)->nullable();
            $table->integer('total_campaigns_done')->nullable();
            $table->decimal('monthly_ad_budget_managed', 12, 2)->nullable();
            $table->decimal('client_retention_rate', 5, 2)->nullable();
            $table->integer('satisfied_clients_count')->nullable();
            $table->integer('successful_projects_count')->nullable();

            // ── Services proposés ─────────────────────────────
            $table->json('services')->nullable();

            // ── Configuration agents IA ────────────────────────
            $table->json('agents_config')->nullable();

            // ── Objectifs ─────────────────────────────────────
            $table->json('objectives')->nullable();
            $table->integer('target_clients')->nullable();
            $table->decimal('target_revenue', 12, 2)->nullable();

            // ── Statut onboarding ─────────────────────────────
            $table->boolean('onboarding_completed')->default(false);
            $table->timestamp('onboarding_completed_at')->nullable();
            $table->integer('onboarding_step')->default(1);

            // ── Marketplace ───────────────────────────────────
            $table->boolean('marketplace_active')->default(false);
            $table->decimal('profile_completeness', 5, 2)->default(0);

            $table->timestamps();
            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('professional_profiles');
    }
};