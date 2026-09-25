<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('generated_contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // ── Paramètres de génération ───────────────────────
            $table->string('subject');
            $table->string('platform');
            $table->string('tone');
            $table->string('language')->default('Français');
            $table->text('extra_context')->nullable();

            // ── Brand voice exemples ───────────────────────────
            $table->json('brand_examples')->nullable();

            // ── Contenu généré ─────────────────────────────────
            $table->json('variants');
            $table->string('image_path')->nullable();
            $table->string('video_path')->nullable();
            $table->string('image_url')->nullable();
            $table->string('video_url')->nullable();

            // ── Brand voice info retourné par l'IA ────────────
            $table->string('brand_voice_dominant_tone')->nullable();
            $table->unsignedInteger('brand_voice_n_examples')->default(0);

            // ── Publication ────────────────────────────────────
            $table->foreignId('social_account_id')
                  ->nullable()
                  ->constrained('social_accounts')
                  ->nullOnDelete();
            $table->integer('selected_variant')->nullable();
            $table->enum('publish_status', [
                'draft',
                'pending',
                'approved',
                'published',
                'failed',
            ])->default('draft');
            $table->string('platform_post_id')->nullable();
            $table->string('platform_post_url')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->text('publish_error')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'platform', 'publish_status']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('generated_contents');
    }
};