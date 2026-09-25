<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Métriques collectées (séries temporelles) ──────────
        // Préfixe an_ = Analytics — unique dans Social Mind AI
        // Une ligne par post collecté (Meta Graph API + Playwright)
        Schema::create('an_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Référence sm_accounts (Agent 2 — comptes du professionnel)
            $table->foreignId('sm_account_id')
                  ->constrained('sm_accounts')
                  ->onDelete('cascade');

            // Optionnel : lien vers le client concerné
            $table->foreignId('client_id')
                  ->nullable()
                  ->constrained('clients')
                  ->nullOnDelete();

            // Identifiant du post sur la plateforme
            $table->string('platform_post_id')->nullable();
            $table->string('platform');          // instagram | facebook | tiktok | linkedin
            $table->string('content_type')->nullable(); // Reel, Post, Carrousel, Story...

            // Métriques collectées (Meta Graph API v21 + Playwright)
            $table->integer('likes')->default(0);
            $table->integer('comments')->default(0);
            $table->integer('shares')->default(0);
            $table->integer('reach')->default(0);
            $table->integer('impressions')->default(0);
            $table->integer('saves')->default(0);
            $table->integer('followers')->default(0);

            // Métriques calculées par CollectMetricsJob
            $table->float('engagement_rate')->nullable();
            $table->float('engagement_score')->nullable();

            // Horodatages
            $table->timestamp('posted_at')->nullable();   // Date de publication du post
            $table->timestamp('collected_at')->useCurrent(); // Date de collecte

            // Source : meta_api | playwright
            $table->string('source')->default('meta_api');

            $table->timestamps();

            $table->index(['user_id', 'sm_account_id', 'collected_at'], 'an_metrics_user_account_date_idx');
            $table->index(['user_id', 'platform', 'collected_at'],      'an_metrics_user_platform_date_idx');
            $table->unique(
                ['sm_account_id', 'platform_post_id', 'collected_at'],
                'an_metrics_unique_post_collection'
            );
        });

        // ── Rapports PDF générés ────────────────────────────────
        Schema::create('an_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('sm_account_id')
                  ->nullable()
                  ->constrained('sm_accounts')
                  ->nullOnDelete();
            $table->foreignId('client_id')
                  ->nullable()
                  ->constrained('clients')
                  ->nullOnDelete();

            $table->string('report_type');     // weekly | monthly
            $table->string('period_label');    // "Janvier 2025", "Semaine 03/2025"
            $table->date('period_start');
            $table->date('period_end');

            // Rapport PDF
            $table->string('pdf_path')->nullable();
            $table->string('pdf_url')->nullable();

            // KPIs résumé
            $table->json('kpis_summary')->nullable();

            // Statut
            $table->enum('status', ['generating', 'ready', 'failed'])->default('generating');
            $table->text('error_message')->nullable();

            $table->timestamps();

            $table->index(
                ['user_id', 'sm_account_id', 'period_start'],
                'an_reports_user_account_period_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('an_reports');
        Schema::dropIfExists('an_metrics');
    }
};