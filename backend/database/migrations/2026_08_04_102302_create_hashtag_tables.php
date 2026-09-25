<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Cache des recherches (24h par utilisateur) ─────────
        Schema::create('hashtag_searches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('subject');
            $table->string('platform');
            $table->string('language')->default('Français');
            $table->json('result_data');
            $table->json('keywords_detected')->nullable();
            $table->integer('total_hashtags')->default(0);
            $table->timestamp('expires_at');
            $table->timestamps();
            $table->index(['user_id', 'platform', 'expires_at']);
        });

        // ── Ensembles de hashtags favoris (CRUD, max 20) ───────
        Schema::create('hashtag_favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('subject');
            $table->string('platform');
            $table->json('hashtags');
            $table->json('categorized')->nullable();
            $table->text('notes')->nullable();
            $table->integer('times_used')->default(0);
            $table->timestamps();
            $table->index(['user_id', 'platform']);
        });

        // ── Cache tendances (24h, partagé entre utilisateurs) ──
        Schema::create('trend_caches', function (Blueprint $table) {
            $table->id();
            $table->string('subject');
            $table->string('platform');
            $table->json('trends_data');
            $table->json('sources_used')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();
            $table->unique(['subject', 'platform']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trend_caches');
        Schema::dropIfExists('hashtag_favorites');
        Schema::dropIfExists('hashtag_searches');
    }
};