<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('cascade');
            $table->foreignId('plan_id')
                  ->constrained()
                  ->onDelete('restrict');

            // ── Stripe ────────────────────────────────────────────
            $table->string('stripe_subscription_id')->nullable()->unique();
            $table->string('stripe_customer_id')->nullable();

            // ── Facturation ───────────────────────────────────────
            $table->enum('billing_cycle', ['monthly', 'yearly', 'trial'])
                  ->default('monthly');

            // ── Statut ────────────────────────────────────────────
            // active, trialing, past_due, canceled, incomplete
            $table->string('status')->default('trialing');

            // ── Dates ─────────────────────────────────────────────
            $table->timestamp('trial_starts_at')->nullable();
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->timestamp('grace_period_ends_at')->nullable();

            // ── Renouvellement ────────────────────────────────────
            $table->boolean('auto_renew')->default(true);
            $table->timestamp('next_billing_at')->nullable();
            $table->decimal('next_billing_amount', 8, 2)->nullable();

            // ── Annulation ────────────────────────────────────────
            $table->string('cancel_reason')->nullable();
            $table->text('cancel_feedback')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('ends_at');
            $table->index('stripe_subscription_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};