<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scheduled_posts', function (Blueprint $table) {

            // ── Colonnes existantes (ne pas toucher) ──────────────
            // id, user_id, social_media_account_id, client_profile_id
            // caption, media_urls, hashtags, post_type
            // scheduled_at, ai_optimized_time
            // status, platform_post_id, error_message, published_at
            // created_by_agent, timestamps

            // ── Nouvelles foreign keys Agent 1 ────────────────────

            // Lien vers la file d'attente (content_queue)
            if (!Schema::hasColumn('scheduled_posts', 'content_queue_id')) {
                $table->unsignedBigInteger('content_queue_id')
                      ->nullable()
                      ->after('user_id');

                // On ajoute la contrainte seulement si la table existe
                if (Schema::hasTable('content_queue')) {
                    $table->foreign('content_queue_id')
                          ->references('id')
                          ->on('content_queue')
                          ->nullOnDelete();
                }
            }

            // Lien vers le créneau optimal sélectionné par KMeans
            if (!Schema::hasColumn('scheduled_posts', 'optimal_slot_id')) {
                $table->unsignedBigInteger('optimal_slot_id')
                      ->nullable()
                      ->after('content_queue_id');

                if (Schema::hasTable('optimal_slots')) {
                    $table->foreign('optimal_slot_id')
                          ->references('id')
                          ->on('optimal_slots')
                          ->nullOnDelete();
                }
            }

            // ── Médias (complète media_urls existant) ─────────────

            // Chemin local du fichier
            if (!Schema::hasColumn('scheduled_posts', 'media_path')) {
                $table->string('media_path')->nullable()->after('caption');
            }

            // URL publique du média (pour l'API Meta)
            if (!Schema::hasColumn('scheduled_posts', 'media_url')) {
                $table->string('media_url')->nullable()->after('media_path');
            }

            // Type de média : image | video | carousel | reel | story | text
            if (!Schema::hasColumn('scheduled_posts', 'media_type')) {
                $table->string('media_type')->default('image')->after('media_url');
            }

            // Items du carousel (JSON)
            if (!Schema::hasColumn('scheduled_posts', 'carousel_items')) {
                $table->json('carousel_items')->nullable()->after('media_type');
            }

            // ── Scores et optimisation IA ─────────────────────────

            // Score du créneau optimal (0-100)
            if (!Schema::hasColumn('scheduled_posts', 'slot_score')) {
                $table->decimal('slot_score', 5, 2)->nullable()->after('ai_optimized_time');
            }

            // ── Publication ───────────────────────────────────────

            // URL du post publié (ex: https://instagram.com/p/xxx)
            if (!Schema::hasColumn('scheduled_posts', 'platform_post_url')) {
                $table->string('platform_post_url')->nullable()->after('platform_post_id');
            }

            // Raison de l'échec (plus détaillé que error_message)
            if (!Schema::hasColumn('scheduled_posts', 'failure_reason')) {
                $table->text('failure_reason')->nullable()->after('error_message');
            }

            // ── Retry system ──────────────────────────────────────
            if (!Schema::hasColumn('scheduled_posts', 'retry_count')) {
                $table->unsignedInteger('retry_count')->default(0)->after('failure_reason');
            }

            if (!Schema::hasColumn('scheduled_posts', 'next_retry_at')) {
                $table->timestamp('next_retry_at')->nullable()->after('retry_count');
            }

            // ── SoftDeletes ───────────────────────────────────────
            if (!Schema::hasColumn('scheduled_posts', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        // ── Mise à jour du ENUM status ────────────────────────────
        // L'ancien : draft | scheduled | published | failed | cancelled
        // Le nouveau : pending | processing | published | failed | cancelled | rescheduled
        // On étend l'enum pour inclure les nouvelles valeurs
        $this->extendStatusEnum();

        // ── Nouveaux index ────────────────────────────────────────
        try {
            Schema::table('scheduled_posts', function (Blueprint $table) {
                $table->index(['social_media_account_id', 'status'], 'sp_account_status_idx');
                $table->index(['status', 'scheduled_at'], 'sp_status_scheduled_idx');
            });
        } catch (\Exception $e) {
            // Index existe déjà — on ignore
        }
    }

    public function down(): void
    {
        Schema::table('scheduled_posts', function (Blueprint $table) {
            // Supprime les foreign keys ajoutées
            try { $table->dropForeign(['content_queue_id']); } catch (\Exception $e) {}
            try { $table->dropForeign(['optimal_slot_id']);  } catch (\Exception $e) {}

            // Supprime les index ajoutés
            try { $table->dropIndex('sp_account_status_idx');   } catch (\Exception $e) {}
            try { $table->dropIndex('sp_status_scheduled_idx'); } catch (\Exception $e) {}

            // Supprime les colonnes ajoutées
            $columns = [
                'content_queue_id', 'optimal_slot_id',
                'media_path', 'media_url', 'media_type', 'carousel_items',
                'slot_score', 'platform_post_url', 'failure_reason',
                'retry_count', 'next_retry_at', 'deleted_at',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('scheduled_posts', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    /**
     * Étend l'enum status pour inclure les nouvelles valeurs de l'Agent 1.
     * Compatible MySQL/MariaDB.
     */
    private function extendStatusEnum(): void
    {
        try {
            DB::statement("
                ALTER TABLE scheduled_posts
                MODIFY COLUMN status ENUM(
                    'draft',
                    'scheduled',
                    'pending',
                    'processing',
                    'published',
                    'failed',
                    'cancelled',
                    'rescheduled'
                ) NOT NULL DEFAULT 'draft'
            ");
        } catch (\Exception $e) {
            // Si la modification échoue (ex: SQLite en test), on ignore
            \Illuminate\Support\Facades\Log::warning(
                'Could not extend scheduled_posts status enum: ' . $e->getMessage()
            );
        }
    }
};