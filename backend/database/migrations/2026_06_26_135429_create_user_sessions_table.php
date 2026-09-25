<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Stocke toutes les sessions actives de chaque utilisateur
        // Permet à l'admin de voir "Appareils connectés"
        // et à l'utilisateur de déconnecter un appareil spécifique
        Schema::create('user_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('cascade');

            // Le token Sanctum associé à cette session
            $table->string('token_id')->nullable()->index();

            // Informations sur l'appareil
            $table->string('device_type')->nullable();   // 'desktop', 'mobile', 'tablet'
            $table->string('device_name')->nullable();   // 'Chrome on Windows'
            $table->string('browser')->nullable();       // 'Chrome 120'
            $table->string('os')->nullable();            // 'Windows 11'
            $table->string('ip_address', 45)->nullable();
            $table->string('location')->nullable();      // 'Casablanca, MA'

            // Statut de la session
            $table->boolean('is_current')->default(false);
            $table->timestamp('last_active_at')->nullable();
            $table->timestamp('expires_at')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'is_current']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_sessions');
    }
};