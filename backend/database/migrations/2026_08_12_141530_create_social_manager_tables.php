<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sm_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')
                  ->nullable()
                  ->constrained('clients')
                  ->nullOnDelete();

            $table->string('platform');
            $table->string('account_id');
            $table->string('account_name');
            $table->string('account_handle')->nullable();
            $table->string('account_type');
            $table->text('access_token');
            $table->text('ig_user_id')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('token_valid')->default(true);
            $table->string('page_id')->nullable();
            $table->json('meta_data')->nullable();

            $table->timestamps();
            $table->unique(['user_id', 'account_id', 'platform']);
            $table->index(
                ['user_id', 'client_id', 'platform', 'is_active'],
                'sm_accounts_user_client_platform_idx'
            );
        });

        Schema::create('sm_content_queue', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('social_account_id')
                  ->constrained('sm_accounts')
                  ->onDelete('cascade');

            $table->text('message');
            $table->string('image_url')->nullable();
            $table->string('link_url')->nullable();
            $table->timestamp('scheduled_at');
            $table->string('prophet_slot_score')->nullable();
            $table->enum('status', ['draft', 'scheduled', 'published', 'failed'])
                  ->default('draft');
            $table->string('meta_post_id')->nullable();
            $table->text('error_message')->nullable();

            $table->timestamps();
            $table->index(
                ['social_account_id', 'scheduled_at', 'status'],
                'sm_queue_account_schedule_status_idx'
            );
            $table->index(['user_id', 'status'], 'sm_queue_user_status_idx');
        });

        Schema::create('sm_comment_inbox', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('social_account_id')
                  ->constrained('sm_accounts')
                  ->onDelete('cascade');

            $table->string('comment_id')->unique();
            $table->string('post_id');
            $table->string('commenter_name')->nullable();
            $table->string('commenter_id')->nullable();
            $table->text('message');
            $table->text('post_content')->nullable();

            $table->string('sentiment_label')->nullable();
            $table->float('sentiment_score')->nullable();
            $table->string('priority')->default('medium');
            $table->string('suggested_action')->nullable();

            $table->text('ai_reply_draft')->nullable();
            $table->text('final_reply')->nullable();

            $table->enum('reply_status', [
                'pending', 'draft', 'approved', 'published', 'skipped',
            ])->default('pending');

            $table->boolean('is_read')->default(false);
            $table->timestamp('meta_created_at')->nullable();
            $table->timestamps();

            $table->index(
                ['user_id', 'reply_status', 'priority'],
                'sm_inbox_user_status_priority_idx'
            );
            $table->index(['user_id', 'sentiment_label'], 'sm_inbox_user_sentiment_idx');
        });

        Schema::create('sm_engagement_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_account_id')
                  ->constrained('sm_accounts')
                  ->onDelete('cascade');

            $table->string('metric_type');
            $table->bigInteger('value')->default(0);
            $table->timestamp('recorded_at');
            $table->timestamps();

            $table->index(
                ['social_account_id', 'metric_type', 'recorded_at'],
                'sm_metrics_account_type_date_idx'
            );
        });

        Schema::create('sm_prophet_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_account_id')
                  ->constrained('sm_accounts')
                  ->onDelete('cascade');

            $table->timestamp('slot_datetime');
            $table->float('predicted_score')->nullable();
            $table->float('lower_bound')->nullable();
            $table->float('upper_bound')->nullable();
            $table->boolean('is_used')->default(false);
            $table->timestamps();

            $table->index(
                ['social_account_id', 'slot_datetime'],
                'sm_slots_account_datetime_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sm_prophet_slots');
        Schema::dropIfExists('sm_engagement_metrics');
        Schema::dropIfExists('sm_comment_inbox');
        Schema::dropIfExists('sm_content_queue');
        Schema::dropIfExists('sm_accounts');
    }
};