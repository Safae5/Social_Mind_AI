<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();

            // ── Informations de l'agent ───────────────────────
            $table->enum('agent_slug', [
                'account-manager',
                'social-manager',
                'content-strategy',
                'content-creator',
                'analytics',
                'ad-optimizer',
                'competitive-intel',
            ]);
            $table->string('agent_name');

            // ── Activité ─────────────────────────────────────
            $table->string('action');
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();

            $table->enum('status', [
                'success',
                'error',
                'running',
                'pending',
            ])->default('success');

            $table->string('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();
            $table->index(['user_id', 'agent_slug', 'created_at']);
            $table->index(['user_id', 'client_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_activity_logs');
    }
};