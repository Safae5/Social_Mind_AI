<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('scheduled_posts', function (Blueprint $table) {
            $table->dropForeign(['social_media_account_id']);
            $table->foreign('social_media_account_id')
                  ->references('id')->on('social_accounts')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('scheduled_posts', function (Blueprint $table) {
            $table->dropForeign(['social_media_account_id']);
            $table->foreign('social_media_account_id')
                  ->references('id')->on('social_media_accounts')
                  ->onDelete('cascade');
        });
    }
};
