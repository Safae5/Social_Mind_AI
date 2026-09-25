<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Comptes concurrents suivis (max 10 par user/client) ─
        // Préfixe ci_ = Competitive Intelligence
        Schema::create('ci_competitor_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')
                  ->nullable()
                  ->constrained('clients')
                  ->nullOnDelete();

            $table->string('name');                  // Nom du concurrent
            $table->string('platform');              // instagram | facebook | tiktok | linkedin
            $table->string('username')->nullable();  // @username
            $table->string('platform_id')->nullable();// ID Meta Graph API
            $table->string('profile_url')->nullable();
            $table->string('avatar_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('followers_count')->nullable();
            $table->text('description')->nullable();
            $table->json('extra_data')->nullable();
            $table->timestamp('last_scraped_at')->nullable();

            $table->timestamps();
            $table->unique(['user_id', 'platform', 'username'], 'ci_accounts_unique_user_platform_user');
            $table->index(['user_id', 'client_id', 'is_active'], 'ci_accounts_user_client_active_idx');
        });

        // ── Posts publics collectés (Meta Graph API + Playwright) ─
        Schema::create('ci_competitor_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('ci_competitor_account_id')
                  ->constrained('ci_competitor_accounts')
                  ->onDelete('cascade');

            $table->string('competitor');              // Nom concurrent (dénormalisé pour l'IA)
            $table->string('platform');
            $table->string('post_id')->nullable();     // ID post sur la plateforme
            $table->text('caption')->nullable();
            $table->string('content_type')->default('Post'); // Reel | Post | Carrousel | Story
            $table->bigInteger('likes')->default(0);
            $table->integer('comments')->default(0);
            $table->integer('shares')->default(0);
            $table->bigInteger('reach')->default(0);
            $table->text('hashtags')->nullable();
            $table->string('post_url')->nullable();
            $table->string('media_url')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->string('source')->default('meta_graph'); // meta_graph | playwright

            $table->timestamps();
            $table->index(
                ['user_id', 'competitor', 'posted_at'],
                'ci_posts_user_comp_date_idx'
            );
            $table->index(
                ['ci_competitor_account_id', 'posted_at'],
                'ci_posts_account_date_idx'
            );
        });

        // ── Rapports de veille générés ─────────────────────────
        Schema::create('ci_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')
                  ->nullable()
                  ->constrained('clients')
                  ->nullOnDelete();

            $table->string('client_brand');
            $table->string('client_niche');
            $table->integer('n_competitors');
            $table->integer('n_posts_analyzed');
            $table->integer('score_menace')->nullable(); // Score 0-100 (Mistral 7B)
            $table->string('pdf_path')->nullable();
            $table->string('pdf_url')->nullable();
            $table->json('strategy_summary')->nullable(); // resume_executif + top_competitor
            $table->enum('status', ['generating','ready','failed'])->default('generating');
            $table->text('error_message')->nullable();

            $table->timestamps();
            $table->index(['user_id', 'client_id', 'created_at'], 'ci_reports_user_client_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ci_reports');
        Schema::dropIfExists('ci_competitor_posts');
        Schema::dropIfExists('ci_competitor_accounts');
    }
};