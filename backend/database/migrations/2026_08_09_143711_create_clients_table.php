<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // ── Identité ──────────────────────────────────────
            $table->string('name');
            $table->string('company_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('website')->nullable();
            $table->string('country')->nullable();
            $table->string('city')->nullable();
            $table->string('industry')->nullable();
            $table->string('niche')->nullable();

            // ── Contrat ───────────────────────────────────────
            $table->enum('contract_type', [
                'monthly_retainer',
                'project_based',
                'hourly',
                'performance_based',
            ])->nullable();
            $table->date('contract_start')->nullable();
            $table->date('contract_end')->nullable();
            $table->decimal('monthly_retainer', 10, 2)->nullable();
            $table->decimal('project_budget', 12, 2)->nullable();
            $table->string('currency')->default('EUR');

            // ── Services ──────────────────────────────────────
            $table->json('services')->nullable();
            $table->json('platforms')->nullable();

            // ── Équipe ────────────────────────────────────────
            $table->json('assigned_team')->nullable();
            $table->json('assigned_agents')->nullable();

            // ── Statut ───────────────────────────────────────
            $table->enum('status', [
                'active',
                'paused',
                'archived',
                'prospect',
            ])->default('active');

            // ── Notes ─────────────────────────────────────────
            $table->text('notes')->nullable();
            $table->string('avatar')->nullable();

            // ── KPIs cibles ────────────────────────────────────
            $table->json('target_kpis')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};