<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoicesforClient', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')->constrained()->onDelete('cascade');

            $table->string('invoice_number')->unique();
            $table->json('line_items');
            $table->decimal('subtotal', 10, 2);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('tax_amount', 10, 2)->default(0);
            $table->decimal('total', 10, 2);
            $table->string('currency')->default('EUR');

            $table->enum('status', [
                'draft',
                'sent',
                'paid',
                'overdue',
                'cancelled',
            ])->default('draft');

            $table->date('issue_date');
            $table->date('due_date');
            $table->date('paid_date')->nullable();

            $table->text('notes')->nullable();
            $table->string('stripe_payment_intent_id')->nullable();
            $table->string('pdf_path')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'client_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoicesforClient');
    }
};