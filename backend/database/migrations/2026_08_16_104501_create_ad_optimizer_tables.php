<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Comptes publicitaires connectés (Meta Ads + Google Ads) ─
        // Préfixe ao_ = Ad Optimizer — unique dans Social Mind AI
        Schema::create('ao_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')
                  ->nullable()
                  ->constrained('clients')
                  ->nullOnDelete();

            $table->string('platform');              // meta | google
            $table->string('platform_account_id');   // act_123456789 (Meta) | 1234567890 (Google)
            $table->string('account_name')->nullable();
            $table->text('access_token');            // Chiffré avec encrypt()
            $table->string('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('meta_data')->nullable();

            $table->timestamps();
            $table->unique(['user_id', 'platform', 'platform_account_id']);
            $table->index(['user_id', 'platform', 'is_active']);
        });

        // ── Métriques campagnes (séries temporelles) ────────────────
        // Une ligne par campagne × par jour
        Schema::create('ao_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')
                  ->nullable()
                  ->constrained('clients')
                  ->nullOnDelete();

            // Identifiants plateforme
            $table->string('campaign_id')->nullable();    // ID Meta ou Google
            $table->string('campaign_name');
            $table->string('platform');                   // meta | google | instagram | tiktok
            $table->string('ad_type')->nullable();        // Image | Vidéo | Carrousel | Stories
            $table->string('audience_age')->nullable();   // 18-24 | 25-34...
            $table->string('audience_gender')->nullable();// Male | Female | All

            // Métriques brutes (Meta Ads API + Google Ads API)
            $table->bigInteger('impressions')->default(0);
            $table->bigInteger('clicks')->default(0);
            $table->decimal('spend', 12, 4)->default(0);
            $table->integer('conversions')->default(0);
            $table->decimal('revenue', 12, 4)->default(0);

            // KPIs calculés
            $table->decimal('ctr', 8, 4)->nullable();
            $table->decimal('cpc', 8, 4)->nullable();
            $table->decimal('cpa', 8, 4)->nullable();
            $table->decimal('roas', 8, 4)->nullable();
            $table->decimal('cpm', 8, 4)->nullable();
            $table->decimal('performance_score', 6, 2)->nullable();

            // Statut automatique
            $table->string('status')->default('Normal');

            // Période
            $table->date('date_start')->nullable();
            $table->date('date_end')->nullable();

            // Source : meta_ads | google_ads | playwright
            $table->string('source')->default('meta_ads');

            $table->timestamps();

            $table->index(
                ['user_id', 'platform', 'date_start'],
                'ao_campaigns_user_platform_date_idx'
            );
            $table->index(
                ['user_id', 'client_id', 'campaign_name'],
                'ao_campaigns_user_client_name_idx'
            );
        });

        // ── Rapports ROI générés ─────────────────────────────────────
        Schema::create('ao_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')
                  ->nullable()
                  ->constrained('clients')
                  ->nullOnDelete();

            $table->string('client_name');
            $table->string('report_type')->default('weekly'); // weekly | monthly
            $table->date('period_start');
            $table->date('period_end');
            $table->string('pdf_path')->nullable();
            $table->string('pdf_url')->nullable();
            $table->json('kpis_summary')->nullable();
            $table->decimal('roas_before', 8, 2)->nullable();
            $table->decimal('roas_after',  8, 2)->nullable();
            $table->decimal('roas_improvement_pct', 6, 1)->nullable();
            $table->enum('status', ['generating', 'ready', 'failed'])->default('generating');
            $table->text('error_message')->nullable();

            $table->timestamps();
            $table->index(['user_id', 'period_start'], 'ao_reports_user_period_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ao_reports');
        Schema::dropIfExists('ao_campaigns');
        Schema::dropIfExists('ao_accounts');
    }
};