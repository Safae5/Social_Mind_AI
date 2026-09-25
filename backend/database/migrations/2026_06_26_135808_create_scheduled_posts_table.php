<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scheduled_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('cascade');
            $table->foreignId('social_media_account_id')
                  ->constrained()
                  ->onDelete('cascade');
            $table->foreignId('client_profile_id')
                  ->nullable()
                  ->constrained()
                  ->onDelete('set null');

            // ── Contenu ───────────────────────────────────────────
            $table->text('caption');
            $table->json('media_urls')->nullable();   // URLs images/vidéos
            $table->json('hashtags')->nullable();
            $table->string('post_type');              // 'reel', 'carousel', 'story', 'static'

            // ── Planification ─────────────────────────────────────
            $table->timestamp('scheduled_at');
            $table->boolean('ai_optimized_time')->default(false);

            // ── Statut ────────────────────────────────────────────
            $table->enum('status', [
                'draft', 'scheduled', 'published', 'failed', 'cancelled'
            ])->default('draft');

            $table->string('platform_post_id')->nullable(); // ID après publication
            $table->text('error_message')->nullable();
            $table->timestamp('published_at')->nullable();

            // ── Agent qui a créé ce post ──────────────────────────
            $table->string('created_by_agent')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'status', 'scheduled_at']);
            $table->index('scheduled_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scheduled_posts');
    }
};