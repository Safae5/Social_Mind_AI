<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Stocke un changement de config DÉSIRÉ pour un agent, en attente
        // d'application. Ce projet configure ses modèles via des variables
        // d'environnement lues au démarrage du process ai-engine (ex:
        // WHISPER_MODEL_SIZE) — il n'y a pas de hot-swap : appliquer un
        // changement stocké ici nécessite de mettre à jour ai-engine/.env
        // et de redémarrer le process. 'applied' reste false tant que ça
        // n'a pas été fait manuellement.
        Schema::create('agent_model_configs', function (Blueprint $table) {
            $table->id();
            $table->string('agent_slug');
            $table->string('config_key');
            $table->string('current_value')->nullable();
            $table->string('desired_value');
            $table->boolean('applied')->default(false);
            $table->foreignId('updated_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['agent_slug', 'config_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_model_configs');
    }
};
