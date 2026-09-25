<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {

            if (!Schema::hasColumn('users', 'profile_type')) {
                $table->string('profile_type')->nullable()->after('role');
            }
            if (!Schema::hasColumn('users', 'brand_niche')) {
                $table->string('brand_niche')->nullable()->after('profile_type');
            }
            if (!Schema::hasColumn('users', 'connected_platforms')) {
                $table->json('connected_platforms')->nullable()->after('brand_niche');
            }
            if (!Schema::hasColumn('users', 'primary_objective')) {
                $table->string('primary_objective')->nullable()->after('connected_platforms');
            }
            if (!Schema::hasColumn('users', 'post_frequency')) {
                $table->string('post_frequency')->nullable()->after('primary_objective');
            }
            if (!Schema::hasColumn('users', 'accounts_count')) {
                $table->string('accounts_count')->nullable()->after('post_frequency');
            }
            if (!Schema::hasColumn('users', 'content_categories')) {
                $table->json('content_categories')->nullable()->after('accounts_count');
            }
            if (!Schema::hasColumn('users', 'brand_tone')) {
                $table->string('brand_tone')->default('casual')->after('content_categories');
            }
            if (!Schema::hasColumn('users', 'brand_examples')) {
                $table->json('brand_examples')->nullable()->after('brand_tone');
            }
            if (!Schema::hasColumn('users', 'onboarding_completed')) {
                $table->boolean('onboarding_completed')->default(false)->after('brand_examples');
            }
            if (!Schema::hasColumn('users', 'onboarding_completed_at')) {
                $table->timestamp('onboarding_completed_at')->nullable()->after('onboarding_completed');
            }
            if (!Schema::hasColumn('users', 'timezone')) {
                $table->string('timezone')->default('Africa/Casablanca')->after('onboarding_completed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = [
                'profile_type', 'brand_niche', 'connected_platforms',
                'primary_objective', 'post_frequency', 'accounts_count',
                'content_categories', 'brand_tone', 'brand_examples',
                'onboarding_completed', 'onboarding_completed_at', 'timezone',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};