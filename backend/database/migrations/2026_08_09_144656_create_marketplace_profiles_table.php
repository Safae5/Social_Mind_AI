<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // ── Identité ──────────────────────────────────────
            $table->string('agency_name');
            $table->text('description')->nullable();
            $table->text('mission')->nullable();
            $table->json('values')->nullable();
            $table->string('positioning')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('cover_path')->nullable();

            // ── CEO ───────────────────────────────────────────
            $table->string('ceo_name')->nullable();
            $table->string('ceo_photo_path')->nullable();
            $table->text('ceo_bio')->nullable();
            $table->json('ceo_social_links')->nullable();

            // ── Équipe ────────────────────────────────────────
            $table->json('team_info')->nullable();

            // ── Réseaux sociaux ───────────────────────────────
            $table->string('instagram_url')->nullable();
            $table->string('facebook_url')->nullable();
            $table->string('linkedin_url')->nullable();
            $table->string('tiktok_url')->nullable();
            $table->string('website_url')->nullable();

            // ── Brand Video ───────────────────────────────────
            $table->string('brand_video_url')->nullable();
            $table->string('brand_video_path')->nullable();
            $table->string('brand_video_thumbnail')->nullable();
            $table->text('brand_video_description')->nullable();

            // ── Vérification ─────────────────────────────────
            $table->enum('verification_status', [
                'unverified',
                'pending',
                'verified',
            ])->default('unverified');

            // ── Visibilité ────────────────────────────────────
            $table->boolean('is_visible')->default(false);
            $table->decimal('profile_completeness', 5, 2)->default(0);

            // ── Stats Marketplace ─────────────────────────────
            $table->integer('profile_views')->default(0);
            $table->integer('contact_requests')->default(0);
            $table->decimal('avg_rating', 3, 2)->default(0);
            $table->integer('reviews_count')->default(0);

            // ── Embedding IA (matching) ────────────────────────
            $table->json('embedding_vector')->nullable();
            $table->json('feature_vector')->nullable();

            $table->timestamps();
            $table->unique('user_id');
        });

        Schema::create('portfolio_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('marketplace_profile_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->string('client_name')->nullable();
            $table->string('niche')->nullable();
            $table->text('campaign_description')->nullable();
            $table->text('objective')->nullable();
            $table->text('strategy')->nullable();
            $table->json('results')->nullable();
            $table->json('kpis')->nullable();
            $table->json('platforms')->nullable();
            $table->string('image_path')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('testimonials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('marketplace_profile_id')->constrained()->onDelete('cascade');
            $table->string('client_name');
            $table->string('client_company')->nullable();
            $table->text('comment');
            $table->decimal('rating', 2, 1);
            $table->boolean('is_verified')->default(false);
            $table->date('testimonial_date')->nullable();
            $table->timestamps();
        });

        Schema::create('case_studies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('marketplace_profile_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->string('client_name')->nullable();
            $table->string('niche')->nullable();
            $table->text('problem')->nullable();
            $table->text('objective')->nullable();
            $table->text('strategy')->nullable();
            $table->json('channels')->nullable();
            $table->decimal('budget', 12, 2)->nullable();
            $table->json('results')->nullable();
            $table->decimal('roas', 8, 2)->nullable();
            $table->decimal('engagement_rate', 5, 2)->nullable();
            $table->decimal('follower_growth', 5, 2)->nullable();
            $table->json('kpis')->nullable();
            $table->integer('campaign_duration_days')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_studies');
        Schema::dropIfExists('testimonials');
        Schema::dropIfExists('portfolio_items');
        Schema::dropIfExists('marketplace_profiles');
    }
};