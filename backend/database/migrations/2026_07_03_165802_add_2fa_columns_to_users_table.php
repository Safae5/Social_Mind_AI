<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Vérifie si les colonnes n'existent pas déjà
            // (elles sont peut-être déjà dans la migration principale)
            if (!Schema::hasColumn('users', 'two_factor_enabled')) {
                $table->boolean('two_factor_enabled')
                      ->default(false)
                      ->after('email_verified_at');
            }

            if (!Schema::hasColumn('users', 'two_factor_secret')) {
                $table->string('two_factor_secret')
                      ->nullable()
                      ->after('two_factor_enabled');
            }

            if (!Schema::hasColumn('users', 'two_factor_recovery_codes')) {
                $table->text('two_factor_recovery_codes')
                      ->nullable()
                      ->after('two_factor_secret');
            }

            // Nouvelle colonne : timestamp de la dernière vérification 2FA
            if (!Schema::hasColumn('users', 'two_factor_confirmed_at')) {
                $table->timestamp('two_factor_confirmed_at')
                      ->nullable()
                      ->after('two_factor_recovery_codes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumnIfExists('two_factor_enabled');
            $table->dropColumnIfExists('two_factor_secret');
            $table->dropColumnIfExists('two_factor_recovery_codes');
            $table->dropColumnIfExists('two_factor_confirmed_at');
        });
    }
};