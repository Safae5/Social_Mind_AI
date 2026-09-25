<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // ── Identité ─────────────────────────────────────────
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('password')->nullable(); // nullable pour OAuth
            $table->string('avatar')->nullable();

            // ── Rôle ─────────────────────────────────────────────
            // 'standard' = utilisateur normal
            // 'business' = agence SMMA
            // 'admin'    = opérateur plateforme
            $table->enum('role', ['standard', 'business', 'admin'])
                  ->default('standard');

            // ── Statut du compte ─────────────────────────────────
            $table->enum('status', ['active', 'inactive', 'suspended', 'banned'])
                  ->default('inactive'); // inactive jusqu'à vérification email

            // ── Vérification email ────────────────────────────────
            $table->timestamp('email_verified_at')->nullable();

            // ── 2FA (Admin uniquement) ────────────────────────────
            $table->boolean('two_factor_enabled')->default(false);
            $table->string('two_factor_secret')->nullable();
            $table->text('two_factor_recovery_codes')->nullable();

            // ── Abonnement actif (cache rapide) ───────────────────
            $table->string('current_plan')->nullable(); // 'free_trial', 'basic', etc.
            $table->timestamp('trial_ends_at')->nullable();

            // ── Préférences ───────────────────────────────────────
            $table->string('locale')->default('fr');
            $table->string('timezone')->default('UTC');
            $table->json('preferences')->nullable(); // paramètres UI, notifications

            // ── Métadonnées ───────────────────────────────────────
            $table->string('last_login_ip')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->integer('login_count')->default(0);

            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes(); // suppression douce pour RGPD

            // ── Index pour performances ───────────────────────────
            $table->index('role');
            $table->index('status');
            $table->index('current_plan');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};