<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('cascade');
            $table->foreignId('subscription_id')
                  ->nullable()
                  ->constrained()
                  ->onDelete('set null');

            // ── Référence ─────────────────────────────────────────
            $table->string('invoice_number')->unique(); // SMI-2024-001
            $table->string('stripe_invoice_id')->nullable();

            // ── Montants ──────────────────────────────────────────
            $table->decimal('subtotal', 10, 2);
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('total', 10, 2);
            $table->string('currency', 3)->default('USD');

            // ── Statut ────────────────────────────────────────────
            $table->enum('status', ['draft', 'open', 'paid', 'void', 'uncollectible'])
                  ->default('open');

            // ── Dates ─────────────────────────────────────────────
            $table->timestamp('issued_at');
            $table->timestamp('due_at')->nullable();
            $table->timestamp('paid_at')->nullable();

            // ── Facture PDF ───────────────────────────────────────
            $table->string('pdf_url')->nullable();

            // ── Détails ───────────────────────────────────────────
            $table->json('line_items')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('invoice_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};