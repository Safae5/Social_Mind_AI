<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('optimal_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('social_account_id')
                  ->constrained('social_accounts')
                  ->onDelete('cascade');

            // ── Créneau ───────────────────────────────────────
            $table->unsignedTinyInteger('day_of_week');  // 0=Lundi, 6=Dimanche
            $table->string('day_name');
            $table->unsignedTinyInteger('hour');
            $table->string('time');                      // "07:00"
            $table->string('platform');

            // ── Scores ─────────────────────────────────────────
            $table->decimal('engagement_score', 8, 2)->default(0);
            $table->decimal('reach_score', 8, 2)->default(0);
            $table->decimal('composite_score', 8, 2)->default(0);
            $table->unsignedInteger('rank')->default(0);
            $table->unsignedInteger('cluster_id')->default(0);
            $table->unsignedInteger('posts_analyzed')->default(0);

            // ── Métadonnées analyse ────────────────────────────
            $table->json('heatmap_data')->nullable();
            $table->json('prophet_forecast')->nullable();
            $table->string('data_source')->default('sample');
            $table->timestamp('analyzed_at')->nullable();
            $table->timestamp('expires_at')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'social_account_id', 'composite_score']);
            $table->index(['user_id', 'day_of_week', 'hour']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('optimal_slots');
    }
};