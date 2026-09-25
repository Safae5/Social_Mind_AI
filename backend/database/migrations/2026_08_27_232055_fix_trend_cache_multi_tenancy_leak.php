<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // trend_caches était partagé entre TOUS les utilisateurs (unique sur
        // subject+platform seulement, sans user_id) — un utilisateur pouvait
        // recevoir la réponse mise en cache d'une recherche faite par un autre.
        // Le cache est vidé ici : ce sont des données dérivées éphémères (24h),
        // aucune perte réelle, juste un cache-miss au prochain appel.
        DB::table('trend_caches')->truncate();

        Schema::table('trend_caches', function (Blueprint $table) {
            $table->dropUnique(['subject', 'platform']);
            $table->foreignId('user_id')->after('id')->constrained()->onDelete('cascade');
            $table->unique(['user_id', 'subject', 'platform']);
            $table->index(['user_id', 'platform', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::table('trend_caches', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropUnique(['user_id', 'subject', 'platform']);
            $table->dropIndex(['user_id', 'platform', 'expires_at']);
            $table->dropColumn('user_id');
            $table->unique(['subject', 'platform']);
        });
    }
};
