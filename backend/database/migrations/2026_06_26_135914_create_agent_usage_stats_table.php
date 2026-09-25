<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_usage_stats', function (Blueprint $table) {
            $table->id();
            $table->string('agent_name');
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained()
                  ->onDelete('set null');
            $table->date('date');
            $table->integer('total_calls')->default(0);
            $table->integer('failed_calls')->default(0);
            $table->decimal('api_cost_usd', 8, 4)->default(0);
            $table->integer('tokens_used')->default(0);
            $table->integer('avg_latency_ms')->default(0);
            $table->timestamps();

            $table->unique(['agent_name', 'user_id', 'date']);
            $table->index(['agent_name', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_usage_stats');
    }
};