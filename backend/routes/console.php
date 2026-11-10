<?php

use App\Jobs\AggregateAgentUsageStatsJob;
use App\Jobs\PollAgentHealthJob;
use App\Jobs\ProcessScheduledPostJob;
use App\Jobs\FetchSocialDataJob;
use App\Models\ScheduledPost;
use App\Models\SocialAccount;
use App\Services\Social\TokenRefreshService;
use Illuminate\Support\Facades\Schedule;

// ── Monitoring des agents IA (Phase 6) ──────────────────────────
// Toutes les minutes ~ 60s demandé par la spec 9.1.
Schedule::job(new PollAgentHealthJob())->everyMinute()->name('poll-agent-health')->withoutOverlapping();
Schedule::job(new AggregateAgentUsageStatsJob())->dailyAt('00:05')->name('aggregate-agent-usage-stats');


// ── Publications automatiques — Toutes les minutes ─────────────
Schedule::call(function () {
    $posts = ScheduledPost::pending()->with('socialAccount')->get();
    foreach ($posts as $post) {
        ProcessScheduledPostJob::dispatch($post);
    }
})->everyMinute()->name('process-scheduled-posts')->withoutOverlapping();

// ── Retry posts échoués — Toutes les 15 minutes ────────────────
Schedule::call(function () {
    $posts = ScheduledPost::failedWithRetries()->with('socialAccount')->get();
    foreach ($posts as $post) {
        ProcessScheduledPostJob::dispatch($post);
    }
})->everyFifteenMinutes()->name('retry-failed-posts');

// ── Renouvellement des tokens — Toutes les heures ─────────────
Schedule::call(function () {
    $service  = app(TokenRefreshService::class);
    $accounts = SocialAccount::where('token_valid', true)
        ->whereNotNull('token_expires_at')
        ->where('token_expires_at', '<=', now()->addHours(24))
        ->get();
    foreach ($accounts as $account) {
        $service->refreshIfNeeded($account);
    }
})->hourly()->name('refresh-tokens');

// ── Rappels email — 1 heure avant publication ─────────────────
Schedule::call(function () {
    $posts = ScheduledPost::where('status', 'pending')
        ->where('scheduled_at', '>=', now()->addMinutes(55))
        ->where('scheduled_at', '<=', now()->addMinutes(65))
        ->with(['user', 'socialAccount'])
        ->get();
    foreach ($posts as $post) {
        $post->user->notify(new \App\Notifications\ScheduledPostReminderNotification($post));
    }
})->everyFifteenMinutes()->name('send-post-reminders');

// ── Polling Inbox toutes les 15 minutes ───────────────────────
Schedule::call(function () {
    $accounts = \App\Models\SocialAccount::active()->get();
    foreach ($accounts as $account) {
        \App\Jobs\FetchInboxMessagesJob::dispatch($account)->onQueue('default');
    }
})->everyFifteenMinutes()->name('fetch-inbox-messages')->withoutOverlapping();

// ── Rapport hebdomadaire — chaque lundi à 8h ──────────────────
Schedule::call(function () {
    $accounts = \App\Models\SocialAccount::active()->get();
    foreach ($accounts as $account) {
        \App\Jobs\GenerateWeeklyReportJob::dispatch($account)->onQueue('default');
    }
})->weeklyOn(1, '08:00')->name('generate-weekly-reports');

// ── Calendrier de contenu — chaque dimanche à 9h ──────────────
// weeklyOn(0, '09:00') : 0 = dimanche en Laravel
Schedule::call(function () {
    \App\Models\User::where('status', 'active')
        ->whereNotNull('onboarding_completed')
        ->where('onboarding_completed', true)
        ->chunk(50, function ($users) {
            foreach ($users as $user) {
                \App\Jobs\GenerateContentCalendarJob::dispatch($user)->onQueue('default');
            }
        });
})->weeklyOn(0, '09:00')->name('generate-content-calendars');




// ── Agent 2 : Gestionnaire RS ─────────────────────────────────
// Polling commentaires toutes les 15 minutes
Schedule::command('social:poll-comments')
    ->everyFifteenMinutes()
    ->name('social-poll-comments')
    ->withoutOverlapping();

// Publication des posts programmés (toutes les minutes)
Schedule::command('social:publish-scheduled')
    ->everyMinute()
    ->name('social-publish')
    ->withoutOverlapping();

// Recalcul créneaux Prophet chaque dimanche à 8h
Schedule::command('social:update-prophet-slots')
    ->weeklyOn(0, '08:00')
    ->name('social-prophet-update');

// Collecte métriques de Page toutes les heures (onglet "Métriques" du
// dashboard — lisait déjà sm_engagement_metrics, mais rien n'écrivait
// jamais dans cette table avant PollSocialMetrics).
Schedule::command('social:poll-metrics')
    ->hourly()
    ->name('social-poll-metrics')
    ->withoutOverlapping();

        // ── Agent 5 : Analytics IA ─────────────────────────────────
    // Collecte métriques toutes les 6 heures (Meta Graph API + Playwright)
    // `users` n'a pas de colonne is_active (seulement `status`, valeurs
    // 'active'/'inactive' — cf. ligne 77 plus haut) : les 5 Schedule::call
    // de ce bloc utilisaient toutes `User::where('is_active', true)`, une
    // colonne inexistante → SQL error à chaque exécution, jamais remontée
    // nulle part (schedule:work avale l'exception par tâche), donc ces 5
    // collectes automatiques (Analytics, Ad Optimizer, Competitive Intel)
    // n'ont jamais tourné une seule fois depuis leur écriture — confirmé en
    // reproduisant en direct : Schema::hasColumn('users','is_active') = false.
    Schedule::call(function () {
        \App\Models\User::where('status', 'active')
            ->whereHas('smAccounts', fn($q) => $q->where('is_active', true))
            ->chunk(50, function ($users) {
                foreach ($users as $user) {
                    \App\Jobs\CollectMetricsJob::dispatch($user)
                        ->onQueue('analytics');
                }
            });
    })->everyFourHours()->name('collect-social-metrics-professional');

    // Rapport mensuel : 1er de chaque mois à 9h
    Schedule::call(function () {
        \App\Models\User::where('status', 'active')
            ->whereHas('smAccounts', fn($q) => $q->where('is_active', true))
            ->chunk(50, function ($users) {
                foreach ($users as $user) {
                    \App\Jobs\GenerateMonthlyAnalyticsReportJob::dispatch($user)
                        ->onQueue('analytics');
                }
            });
    })->monthlyOn(1, '09:00')->name('generate-monthly-an-reports');

    // ── Agent 6 : Optimisation Publicitaire ────────────────────
// Collecte quotidienne Meta Ads + Google Ads
Schedule::call(function () {
    \App\Models\User::where('status', 'active')
        ->whereHas('aoAccounts', fn($q) => $q->where('is_active', true))
        ->chunk(50, function ($users) {
            foreach ($users as $user) {
                \App\Jobs\CollectAdMetricsJob::dispatch($user)
                    ->onQueue('ad_optimizer');
            }
        });
})->daily()->name('collect-ad-metrics');

// Rapport ROI hebdomadaire : chaque lundi à 8h
Schedule::call(function () {
    \App\Models\User::where('status', 'active')->chunk(50, function ($users) {
        foreach ($users as $user) {
            \App\Jobs\CollectAdMetricsJob::dispatch($user)->onQueue('ad_optimizer');
        }
    });
})->weekly()->mondays()->at('08:00')->name('generate-weekly-ao-reports');

// ── Agent 7 : Veille Concurrentielle ───────────────────────
// Collecte quotidienne données concurrents à 2h du matin
Schedule::call(function () {
    \App\Models\User::where('status', 'active')
        ->whereHas('ciCompetitorAccounts', fn($q) => $q->where('is_active', true))
        ->chunk(50, function ($users) {
            foreach ($users as $user) {
                \App\Jobs\CollectCompetitorDataJob::dispatch($user)
                    ->onQueue('competitive_intel');
            }
        });
})->dailyAt('02:00')
  ->name('collect-competitor-data-ci')
  ->description('Collecte quotidienne Meta Graph API + Playwright (ci_competitor_posts)');