<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_workspaces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')->constrained()->onDelete('cascade');

            $table->string('name');
            $table->text('description')->nullable();

            // Données agrégées workspace
            $table->json('settings')->nullable();
            $table->json('connected_platforms')->nullable();
            $table->boolean('agents_active')->default(true);

            $table->enum('status', ['active', 'paused', 'archived'])->default('active');
            $table->timestamps();

            $table->unique(['user_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_workspaces');
    }
};