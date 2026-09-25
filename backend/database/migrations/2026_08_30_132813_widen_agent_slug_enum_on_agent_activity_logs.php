<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * agent_slug ne couvrait à l'origine que les 7 agents Professional (CRM) —
 * les 6 agents Standard (scheduler, content-generator, hashtags, auto-reply,
 * weekly-report, content-calendar) ne pouvaient pas y écrire, ce qui
 * empêchait tout quota/métrique réel côté Admin Panel (Phase 6) pour ces
 * agents. On élargit l'ENUM existant plutôt que créer une table parallèle.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE agent_activity_logs MODIFY agent_slug ENUM(
            'scheduler', 'content-generator', 'hashtags', 'auto-reply', 'weekly-report', 'content-calendar',
            'account-manager', 'social-manager', 'content-strategy', 'content-creator', 'analytics', 'ad-optimizer', 'competitive-intel'
        ) NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE agent_activity_logs MODIFY agent_slug ENUM(
            'account-manager', 'social-manager', 'content-strategy', 'content-creator', 'analytics', 'ad-optimizer', 'competitive-intel'
        ) NOT NULL");
    }
};
