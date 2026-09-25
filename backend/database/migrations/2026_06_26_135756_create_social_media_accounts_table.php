<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Comptes réseaux sociaux connectés à la plateforme
        // (Instagram, TikTok, Facebook, LinkedIn, Twitter)
        Schema::create('social_media_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('cascade');
            $table->foreignId('client_profile_id')
                  ->nullable()
                  ->constrained()
                  ->onDelete('cascade'); // null = compte personnel de l'utilisateur Standard

            // ── Plateforme ────────────────────────────────────────
            $table->enum('platform', [
                'instagram', 'facebook', 'tiktok',
                'linkedin', 'twitter', 'youtube'
            ]);

            // ── Identité du compte ────────────────────────────────
            $table->string('platform_user_id');  // ID chez la plateforme
            $table->string('username');
            $table->string('display_name')->nullable();
            $table->string('avatar_url')->nullable();
            $table->string('profile_url')->nullable();

            // ── Tokens API ────────────────────────────────────────
            $table->text('access_token');        // chiffré
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();

            // ── Meta (page Facebook, Business account) ────────────
            $table->string('page_id')->nullable();
            $table->string('page_access_token')->nullable();
            $table->boolean('is_business_account')->default(false);

            // ── Statistiques de base (cache) ──────────────────────
            $table->integer('followers_count')->default(0);
            $table->integer('following_count')->default(0);
            $table->integer('posts_count')->default(0);
            $table->timestamp('stats_updated_at')->nullable();

            // ── Statut ────────────────────────────────────────────
            $table->boolean('is_active')->default(true);
            $table->boolean('token_valid')->default(true);
            $table->string('error_message')->nullable();

            $table->timestamps();

            $table->unique(['user_id', 'platform', 'platform_user_id']);
            $table->index(['user_id', 'platform', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_media_accounts');
    }
};