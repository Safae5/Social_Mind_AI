<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_accounts', function (Blueprint $table) {

            // ── Colonnes existantes (ne pas toucher) ──────────
            // id, user_id, provider, provider_id
            // access_token, refresh_token, token_expires_at
            // nickname, name, email, avatar
            // timestamps

            // ── Nouvelles colonnes pour l'Agent 1 ─────────────

            // Plateforme sociale (Instagram, TikTok, Facebook page...)
            // nullable car les comptes OAuth (Google) n'ont pas de plateforme
            if (!Schema::hasColumn('social_accounts', 'platform')) {
                $table->string('platform')->nullable()->after('provider');
            }

            if (!Schema::hasColumn('social_accounts', 'platform_user_id')) {
                $table->string('platform_user_id')->nullable()->after('platform');
            }

            if (!Schema::hasColumn('social_accounts', 'platform_username')) {
                $table->string('platform_username')->nullable()->after('platform_user_id');
            }

            if (!Schema::hasColumn('social_accounts', 'platform_display_name')) {
                $table->string('platform_display_name')->nullable()->after('platform_username');
            }

            if (!Schema::hasColumn('social_accounts', 'platform_avatar_url')) {
                $table->string('platform_avatar_url')->nullable()->after('platform_display_name');
            }

            // Facebook Page ID (pour publier sur une Page, pas le profil personnel)
            if (!Schema::hasColumn('social_accounts', 'page_id')) {
                $table->string('page_id')->nullable()->after('platform_avatar_url');
            }

            if (!Schema::hasColumn('social_accounts', 'page_name')) {
                $table->string('page_name')->nullable()->after('page_id');
            }

            // Token spécifique à la Page Facebook (différent du token utilisateur)
            if (!Schema::hasColumn('social_accounts', 'page_access_token')) {
                $table->text('page_access_token')->nullable()->after('refresh_token');
            }

            if (!Schema::hasColumn('social_accounts', 'token_refreshed_at')) {
                $table->timestamp('token_refreshed_at')->nullable()->after('token_expires_at');
            }

            // Métriques du compte social
            if (!Schema::hasColumn('social_accounts', 'followers_count')) {
                $table->unsignedBigInteger('followers_count')->default(0)->after('avatar');
            }

            if (!Schema::hasColumn('social_accounts', 'following_count')) {
                $table->unsignedBigInteger('following_count')->default(0)->after('followers_count');
            }

            if (!Schema::hasColumn('social_accounts', 'posts_count')) {
                $table->unsignedBigInteger('posts_count')->default(0)->after('following_count');
            }

            // Type de compte : personal | business | creator | oauth_login
            if (!Schema::hasColumn('social_accounts', 'account_type')) {
                $table->string('account_type')->default('oauth_login')->after('posts_count');
            }

            // Statut de connexion
            if (!Schema::hasColumn('social_accounts', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('account_type');
            }

            if (!Schema::hasColumn('social_accounts', 'token_valid')) {
                $table->boolean('token_valid')->default(true)->after('is_active');
            }

            if (!Schema::hasColumn('social_accounts', 'token_error')) {
                $table->string('token_error')->nullable()->after('token_valid');
            }

            if (!Schema::hasColumn('social_accounts', 'last_synced_at')) {
                $table->timestamp('last_synced_at')->nullable()->after('token_error');
            }

            if (!Schema::hasColumn('social_accounts', 'granted_permissions')) {
                $table->json('granted_permissions')->nullable()->after('last_synced_at');
            }

            // SoftDeletes (pour déconnecter sans supprimer l'historique)
            if (!Schema::hasColumn('social_accounts', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        // ── Ajouter un index utile pour les comptes réseaux sociaux ──
        // Vérifie que l'index n'existe pas avant de l'ajouter
        try {
            Schema::table('social_accounts', function (Blueprint $table) {
                $table->index(['user_id', 'platform', 'is_active'], 'sa_user_platform_active_idx');
            });
        } catch (\Exception $e) {
            // Index existe peut-être déjà — on ignore
        }
    }

    public function down(): void
    {
        Schema::table('social_accounts', function (Blueprint $table) {
            // Supprime les index ajoutés
            try {
                $table->dropIndex('sa_user_platform_active_idx');
            } catch (\Exception $e) {}

            // Supprime les colonnes ajoutées
            $columns = [
                'platform', 'platform_user_id', 'platform_username',
                'platform_display_name', 'platform_avatar_url',
                'page_id', 'page_name', 'page_access_token',
                'token_refreshed_at', 'followers_count', 'following_count',
                'posts_count', 'account_type', 'is_active', 'token_valid',
                'token_error', 'last_synced_at', 'granted_permissions',
                'deleted_at',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('social_accounts', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};