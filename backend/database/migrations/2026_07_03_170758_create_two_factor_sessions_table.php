<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Cette table garde en mémoire que l'admin a déjà passé la 2FA
        // pour cette session (évite de demander le code à chaque requête)
        Schema::create('two_factor_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('cascade');
            $table->string('session_token', 64)->unique();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('verified_at');
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['user_id', 'session_token']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('two_factor_sessions');
    }
};