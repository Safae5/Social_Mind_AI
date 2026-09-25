<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Stocke les comptes OAuth liés (Google, Facebook)
        // Un utilisateur peut lier plusieurs providers OAuth
        Schema::create('social_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('cascade');

            // Le provider OAuth : 'google', 'facebook'
            $table->string('provider');
            // L'ID unique de l'utilisateur chez ce provider
            $table->string('provider_id');

            // Tokens OAuth
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();

            // Infos du profil OAuth
            $table->string('nickname')->nullable();
            $table->string('name')->nullable();
            $table->string('email')->nullable();
            $table->string('avatar')->nullable();

            $table->timestamps();

            // Un utilisateur ne peut avoir qu'un seul compte par provider
            $table->unique(['user_id', 'provider']);
            $table->index(['provider', 'provider_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_accounts');
    }
};