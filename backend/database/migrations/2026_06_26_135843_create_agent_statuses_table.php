<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('agent_name')->unique();
            $table->enum('status', ['online', 'idle', 'error', 'disabled'])
                  ->default('idle');
            $table->integer('latency_ms')->nullable();
            $table->float('memory_mb')->nullable();
            $table->float('cpu_percent')->nullable();
            $table->integer('queue_depth')->default(0);
            $table->text('last_error')->nullable();
            $table->boolean('enabled')->default(true);
            $table->timestamp('last_seen')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_statuses');
    }
};