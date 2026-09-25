<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();

            // ── Identité du plan ──────────────────────────────────
            $table->string('name');              // 'Normal Basic', 'Business Premium'
            $table->string('slug')->unique();    // 'normal_basic', 'business_premium'
            $table->text('description')->nullable();

            // ── Ciblage ───────────────────────────────────────────
            $table->enum('type', ['standard', 'business'])
                  ->default('standard');

            // ── Prix ──────────────────────────────────────────────
            $table->decimal('price_monthly', 8, 2)->default(0);
            $table->decimal('price_yearly', 8, 2)->default(0);
            $table->string('currency')->default('USD');

            // ── Stripe ────────────────────────────────────────────
            $table->string('stripe_price_id_monthly')->nullable();
            $table->string('stripe_price_id_yearly')->nullable();
            $table->string('stripe_product_id')->nullable();

            // ── Limites et fonctionnalités ────────────────────────
            // Stockées en JSON pour être flexibles
            // Exemple: {"posts_per_month": 30, "ai_calls_per_day": 50}
            $table->json('features')->nullable();
            $table->json('limits')->nullable();

            // ── Essai gratuit ─────────────────────────────────────
            $table->boolean('has_trial')->default(false);
            $table->integer('trial_days')->default(0);

            // ── Affichage ─────────────────────────────────────────
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->integer('sort_order')->default(0);
            $table->string('color')->nullable(); // pour l'UI

            $table->timestamps();

            $table->index(['type', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};