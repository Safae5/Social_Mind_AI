<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_queue', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('social_account_id')
                  ->constrained('social_accounts')
                  ->onDelete('cascade');

            // ── Contenu ───────────────────────────────────────
            $table->text('caption');
            $table->json('hashtags')->nullable();
            $table->string('media_path')->nullable();
            $table->string('media_url')->nullable();
            $table->enum('media_type', ['image', 'video', 'carousel', 'reel', 'story', 'text'])
                  ->default('image');
            $table->json('carousel_items')->nullable();

            // ── Source ────────────────────────────────────────
            $table->enum('source', ['manual', 'ai_generated', 'calendar', 'imported'])
                  ->default('manual');
            $table->unsignedBigInteger('generated_content_id')->nullable();
            $table->unsignedBigInteger('calendar_slot_id')->nullable();

            // ── Statut ─────────────────────────────────────────
            $table->enum('status', [
                'queued',      // En attente d'assignation à un créneau
                'scheduled',   // Assigné à un créneau optimal
                'published',   // Publié avec succès
                'failed',      // Échec de publication
                'cancelled',   // Annulé
                'paused',      // En pause
            ])->default('queued');

            $table->unsignedInteger('queue_position')->default(0);
            $table->text('failure_reason')->nullable();
            $table->unsignedInteger('retry_count')->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status', 'queue_position']);
            $table->index(['social_account_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_queue');
    }
};