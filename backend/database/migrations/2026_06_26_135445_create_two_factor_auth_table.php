<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Table pour les tentatives 2FA et les codes de récupération utilisés
        Schema::create('two_factor_auth_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('cascade');

            $table->enum('type', ['totp', 'recovery_code']);
            $table->boolean('success')->default(false);
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'success']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('two_factor_auth_logs');
    }
};