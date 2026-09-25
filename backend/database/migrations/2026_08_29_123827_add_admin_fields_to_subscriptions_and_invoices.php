<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // subscriptions.stripe_subscription_id est déjà nullable+unique — le schéma
        // supporte déjà des abonnements "locaux" sans Stripe. On ajoute juste de quoi
        // les distinguer clairement (source de vérité) des abonnements réels.
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->string('source')->default('stripe')->after('stripe_customer_id'); // stripe | admin_manual
            $table->foreignId('granted_by')->nullable()->after('source')
                  ->constrained('users')->nullOnDelete();
        });

        // Remboursements : colonnes additives, on ne touche pas à l'enum status
        // existant (draft/open/paid/void/uncollectible) pour rester non-invasif.
        Schema::table('invoices', function (Blueprint $table) {
            $table->timestamp('refunded_at')->nullable()->after('paid_at');
            $table->decimal('refund_amount', 10, 2)->nullable()->after('refunded_at');
            $table->foreignId('refunded_by')->nullable()->after('refund_amount')
                  ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropForeign(['granted_by']);
            $table->dropColumn(['source', 'granted_by']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['refunded_by']);
            $table->dropColumn(['refunded_at', 'refund_amount', 'refunded_by']);
        });
    }
};
