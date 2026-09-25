<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\OAuthController;
use App\Http\Controllers\Api\Auth\TwoFactorController;
use App\Http\Controllers\Api\Auth\MetaOAuthController;
use App\Http\Controllers\Api\Auth\TikTokOAuthController;
use App\Http\Controllers\Api\Auth\InstagramDirectOAuthController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\Api\User\SchedulerController;
use Illuminate\Support\Facades\Route;

// ══════════════════════════════════════════════════════════════
// Routes publiques — sans authentification
// ══════════════════════════════════════════════════════════════

Route::get('/test', fn() => response()->json([
    'success' => true,
    'message' => 'API OK',
]));

Route::get('/plans', [SubscriptionController::class, 'plans']);

Route::post('/webhooks/stripe', [WebhookController::class, 'handleStripe']);

Route::prefix('auth')->group(function () {
    Route::post('/register',        [AuthController::class, 'register']);
    Route::post('/login',           [AuthController::class, 'login'])->middleware('throttle:6,1');
    Route::post('/refresh',         [AuthController::class, 'refresh']);
    Route::post('/email/verify',    [AuthController::class, 'verifyEmail']);
    Route::post('/email/resend',    [AuthController::class, 'resendVerification']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password',  [AuthController::class, 'resetPassword']);
});

// ── Route développement uniquement ───────────────────────────
if (app()->environment('local')) {
    Route::get('/dev/verify-email/{email}', function (string $email) {
        $user = \App\Models\User::where('email', $email)->firstOrFail();
        $user->update([
            'email_verified_at' => now(),
            'status'            => 'active',
        ]);
        return response()->json([
            'success' => true,
            'message' => "Email {$email} vérifié.",
        ]);
    });
}

// ══════════════════════════════════════════════════════════════
// Routes protégées — auth:api (JWT)
// ══════════════════════════════════════════════════════════════

Route::middleware(['auth:api', 'account.active'])->group(function () {

    // ── Auth ──────────────────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('/logout',             [AuthController::class, 'logout']);
        Route::post('/logout-all',         [AuthController::class, 'logoutAll']);
        Route::get('/me',                  [AuthController::class, 'me']);
        Route::put('/password',            [AuthController::class, 'updatePassword']);
        Route::get('/notifications',       [AuthController::class, 'getNotifications']);
        Route::put('/notifications',       [AuthController::class, 'updateNotifications']);
        Route::get('/token/info',          [AuthController::class, 'tokenInfo']);
        Route::get('/sessions',            [AuthController::class, 'sessions']);
        Route::delete('/sessions/others',  [AuthController::class, 'revokeOtherSessions']);
        Route::delete('/sessions/{id}',    [AuthController::class, 'revokeSession']);
        Route::get('/social-accounts',     [OAuthController::class, 'linkedAccounts']);
        Route::post('/link/{provider}',    [OAuthController::class, 'linkAccount']);
        Route::delete('/unlink/{provider}',[OAuthController::class, 'unlinkAccount']);
    });

    // ── 2FA ───────────────────────────────────────────────────
    Route::prefix('2fa')->group(function () {
        Route::get('/status',                     [TwoFactorController::class, 'status']);
        Route::get('/setup',                      [TwoFactorController::class, 'setup']);
        Route::post('/confirm',                   [TwoFactorController::class, 'confirm'])->middleware('throttle:6,1');
        Route::delete('/disable',                 [TwoFactorController::class, 'disable']);
        Route::post('/verify',                    [TwoFactorController::class, 'verify'])->middleware('throttle:6,1');
        Route::get('/recovery-codes',             [TwoFactorController::class, 'recoveryCodes']);
        Route::post('/recovery-codes/regenerate', [TwoFactorController::class, 'regenerateRecoveryCodes']);
    });

    // ── Abonnements ───────────────────────────────────────────
    Route::prefix('subscription')->group(function () {
        Route::get('/',          [SubscriptionController::class, 'current']);
        Route::post('/checkout', [SubscriptionController::class, 'checkout']);
        Route::post('/portal',   [SubscriptionController::class, 'portal']);
        Route::post('/cancel',   [SubscriptionController::class, 'cancel']);
        Route::get('/invoices',  [SubscriptionController::class, 'invoices']);
        Route::get('/success',   [SubscriptionController::class, 'success']);
    });

    // ── Onboarding ────────────────────────────────────────────
    Route::post('/onboarding', function (\Illuminate\Http\Request $request) {
        $user = $request->user();
        $user->update([
            'brand_niche'           => $request->brand_niche,
            'connected_platforms'   => $request->platforms ?? [],
            'post_frequency'        => $request->post_frequency ?? 5,
            'content_objectives'    => $request->objective ? [$request->objective] : [],
            'brand_tone'            => 'decontracte',
            'brand_examples'        => $request->brand_examples ?? [],
            'onboarding_completed'  => true,
        ]);
        return response()->json(['success' => true, 'message' => 'Profil configuré !']);
    });

    // ── OAuth Meta + TikTok (redirect URLs — voir routes/web.php, session requise) ──
    Route::delete('/oauth/meta/disconnect/{id}',     [MetaOAuthController::class, 'disconnect']);
    Route::delete('/oauth/instagram-direct/disconnect/{id}', [InstagramDirectOAuthController::class, 'disconnect']);
    Route::delete('/oauth/tiktok/disconnect/{id}',   [TikTokOAuthController::class, 'disconnect']);

    // ── Scheduler (Agent 1) ───────────────────────────────────
    Route::prefix('scheduler')->group(function () {
        Route::get('/accounts',                          [SchedulerController::class, 'accounts']);
        Route::post('/analyze',                          [SchedulerController::class, 'analyze'])->middleware('agent:scheduler');
        Route::get('/calendar',                          [SchedulerController::class, 'calendar']);
        Route::get('/slots',                             [SchedulerController::class, 'optimalSlots']);
        Route::get('/upcoming',                          [SchedulerController::class, 'upcoming']);
        Route::get('/queue',                             [SchedulerController::class, 'queue']);
        Route::post('/queue',                            [SchedulerController::class, 'addToQueue']);
        Route::delete('/queue/{id}',                     [SchedulerController::class, 'removeFromQueue']);
        Route::post('/posts/{id}/cancel',                [SchedulerController::class, 'cancelScheduledPost']);
        Route::delete('/accounts/{platform}/disconnect', [SchedulerController::class, 'disconnectAccount']);
    });

    // ── Agent 2 : Générateur de Légendes ─────────────────────────
   Route::prefix('content')->group(function () {
        Route::get('/',                        [\App\Http\Controllers\Api\User\ContentGeneratorController::class, 'index']);
        Route::post('/generate',               [\App\Http\Controllers\Api\User\ContentGeneratorController::class, 'generate'])->middleware('agent:content-generator');
        Route::get('/{id}',                    [\App\Http\Controllers\Api\User\ContentGeneratorController::class, 'show']);
        Route::get('/{id}/download/image',     [\App\Http\Controllers\Api\User\ContentGeneratorController::class, 'downloadImage']);
        Route::get('/{id}/download/video',     [\App\Http\Controllers\Api\User\ContentGeneratorController::class, 'downloadVideo']);
        Route::post('/{id}/publish',           [\App\Http\Controllers\Api\User\PublishController::class, 'publish']);
        Route::post('/{id}/cancel',            [\App\Http\Controllers\Api\User\PublishController::class, 'cancel']);
    });

    // ── Agent 3 : Hashtags & Tendances ───────────────────────────
    Route::prefix('hashtags')->group(function () {
        Route::post('/generate',              [\App\Http\Controllers\Api\User\HashtagSuggesterController::class, 'generate'])->middleware('agent:hashtags');
        Route::post('/trends',                [\App\Http\Controllers\Api\User\HashtagSuggesterController::class, 'trends']);
        Route::get('/history',                [\App\Http\Controllers\Api\User\HashtagSuggesterController::class, 'history']);
        Route::get('/favorites',              [\App\Http\Controllers\Api\User\HashtagSuggesterController::class, 'favorites']);
        Route::post('/favorites',             [\App\Http\Controllers\Api\User\HashtagSuggesterController::class, 'saveFavorite']);
        Route::put('/favorites/{id}',         [\App\Http\Controllers\Api\User\HashtagSuggesterController::class, 'updateFavorite']);
        Route::delete('/favorites/{id}',      [\App\Http\Controllers\Api\User\HashtagSuggesterController::class, 'deleteFavorite']);
        Route::post('/favorites/{id}/use',    [\App\Http\Controllers\Api\User\HashtagSuggesterController::class, 'useFavorite']);
    });

    // ── Agent 4 : Répondeur Automatique ──────────────────────────
    Route::prefix('inbox')->group(function () {
        Route::get('/',                          [\App\Http\Controllers\Api\User\InboxController::class, 'index']);
        Route::post('/refresh',                  [\App\Http\Controllers\Api\User\InboxController::class, 'refresh'])->middleware('agent:auto-reply');
        Route::post('/{id}/read',                [\App\Http\Controllers\Api\User\InboxController::class, 'markRead']);
        Route::get('/config/{accountId}',        [\App\Http\Controllers\Api\User\InboxController::class, 'getConfig']);
        Route::put('/config/{accountId}',        [\App\Http\Controllers\Api\User\InboxController::class, 'updateConfig']);
        Route::post('/{id}/approve',             [\App\Http\Controllers\Api\User\ReplyController::class, 'approve']);
        Route::post('/{id}/reject',              [\App\Http\Controllers\Api\User\ReplyController::class, 'reject']);
        Route::post('/{id}/flag',                [\App\Http\Controllers\Api\User\ReplyController::class, 'flag']);
        Route::post('/{id}/regenerate',          [\App\Http\Controllers\Api\User\ReplyController::class, 'regenerate']);
    });

    // ── Agent 5 : Résumé Performance Hebdomadaire ────────────────
    Route::prefix('weekly-reports')->group(function () {
        Route::get('/',          [\App\Http\Controllers\Api\User\WeeklyReportController::class, 'index']);
        Route::get('/latest',    [\App\Http\Controllers\Api\User\WeeklyReportController::class, 'latest']);
        Route::get('/{id}',      [\App\Http\Controllers\Api\User\WeeklyReportController::class, 'show']);
        Route::post('/generate', [\App\Http\Controllers\Api\User\WeeklyReportController::class, 'generateNow'])->middleware('agent:weekly-report');
    });

    // ── Agent 6 : Calendrier de Contenu IA ───────────────────────
    Route::prefix('calendar')->group(function () {
        Route::get('/',                          [\App\Http\Controllers\Api\User\ContentCalendarController::class, 'index']);
        Route::get('/current',                   [\App\Http\Controllers\Api\User\ContentCalendarController::class, 'current']);
        Route::post('/generate',                 [\App\Http\Controllers\Api\User\ContentCalendarController::class, 'generateNow'])->middleware('agent:content-calendar');
        Route::post('/{id}/approve-all',         [\App\Http\Controllers\Api\User\ContentCalendarController::class, 'approveAll']);
        Route::post('/slots/{id}/approve',       [\App\Http\Controllers\Api\User\ContentCalendarController::class, 'approveSlot']);
        Route::post('/slots/{id}/modify',        [\App\Http\Controllers\Api\User\ContentCalendarController::class, 'modifySlot']);
        Route::post('/slots/{id}/skip',          [\App\Http\Controllers\Api\User\ContentCalendarController::class, 'skipSlot']);
        Route::post('/slots/{id}/regenerate',    [\App\Http\Controllers\Api\User\ContentCalendarController::class, 'regenerateSlot']);
        Route::post('/slots/{id}/queue',         [\App\Http\Controllers\Api\User\ContentCalendarController::class, 'queueSlot']);
    });

        
   


    // ── Dashboard Standard ────────────────────────────────────
    Route::middleware(['role:standard', 'verified', 'subscription'])
        ->prefix('standard')
        ->group(fn() => Route::get('/dashboard', fn() => response()->json([
            'success' => true,
            'data'    => ['message' => 'Dashboard Standard OK'],
        ])));

    // ✅ APRÈS — Dashboard Professionnel complet
    Route::middleware(['auth:api', 'role:business', 'verified', 'subscription'])
    ->prefix('professional')
    ->group(function () {

        // ── Onboarding ────────────────────────────────────────
        Route::prefix('onboarding')->group(function () {
            Route::get('/',            [\App\Http\Controllers\Api\Professional\ProfessionalOnboardingController::class, 'getStatus']);
            Route::post('/step/{step}',[\App\Http\Controllers\Api\Professional\ProfessionalOnboardingController::class, 'saveStep']);
            Route::post('/complete',   [\App\Http\Controllers\Api\Professional\ProfessionalOnboardingController::class, 'complete']);
        });

        // ── Profil agence (Paramètres) ─────────────────────────
        Route::put('/profile', [\App\Http\Controllers\Api\Professional\ProfessionalOnboardingController::class, 'updateProfile']);

        // ── CRM Clients ───────────────────────────────────────
        Route::prefix('clients')->group(function () {
            Route::get('/',               [\App\Http\Controllers\Api\Professional\ClientController::class, 'index']);
            Route::post('/',              [\App\Http\Controllers\Api\Professional\ClientController::class, 'store']);
            Route::get('/{id}',           [\App\Http\Controllers\Api\Professional\ClientController::class, 'show']);
            Route::put('/{id}',           [\App\Http\Controllers\Api\Professional\ClientController::class, 'update']);
            Route::delete('/{id}',        [\App\Http\Controllers\Api\Professional\ClientController::class, 'destroy']);
            Route::get('/{id}/workspace', [\App\Http\Controllers\Api\Professional\ClientController::class, 'workspace']);
        });

        // ── Agents IA ─────────────────────────────────────────
        Route::prefix('agents')->group(function () {
            Route::get('/',         [\App\Http\Controllers\Api\Professional\AgentController::class, 'index']);
            Route::get('/activity', [\App\Http\Controllers\Api\Professional\AgentController::class, 'activity']);
            Route::post('/log',     [\App\Http\Controllers\Api\Professional\AgentController::class, 'logActivity']);
        });

        // ── Analytics agrégées ─────────────────────────────────
        Route::get('/analytics', [\App\Http\Controllers\Api\Professional\AnalyticsAggregateController::class, 'index']);

        // ── Facturation ───────────────────────────────────────
        Route::prefix('invoices')->group(function () {
            Route::get('/',              [\App\Http\Controllers\Api\Professional\BillingController::class, 'index']);
            Route::post('/',             [\App\Http\Controllers\Api\Professional\BillingController::class, 'store']);
            Route::put('/{id}/status',   [\App\Http\Controllers\Api\Professional\BillingController::class, 'updateStatus']);
        });

        // ── Marketplace ───────────────────────────────────────
        Route::prefix('marketplace')->group(function () {
            Route::get('/profile',             [\App\Http\Controllers\Api\Professional\MarketplaceController::class, 'getProfile']);
            Route::post('/profile',            [\App\Http\Controllers\Api\Professional\MarketplaceController::class, 'saveProfile']);

            // Portfolio
            Route::post('/portfolio',          [\App\Http\Controllers\Api\Professional\MarketplaceController::class, 'addPortfolioItem']);
            Route::put('/portfolio/{id}',      [\App\Http\Controllers\Api\Professional\MarketplaceController::class, 'updatePortfolioItem']);
            Route::delete('/portfolio/{id}',   [\App\Http\Controllers\Api\Professional\MarketplaceController::class, 'deletePortfolioItem']);

            // Témoignages
            Route::post('/testimonial',        [\App\Http\Controllers\Api\Professional\MarketplaceController::class, 'addTestimonial']);
            Route::put('/testimonial/{id}',    [\App\Http\Controllers\Api\Professional\MarketplaceController::class, 'updateTestimonial']);
            Route::delete('/testimonial/{id}', [\App\Http\Controllers\Api\Professional\MarketplaceController::class, 'deleteTestimonial']);

            // Études de cas
            Route::post('/case-study',         [\App\Http\Controllers\Api\Professional\MarketplaceController::class, 'addCaseStudy']);
            Route::put('/case-study/{id}',     [\App\Http\Controllers\Api\Professional\MarketplaceController::class, 'updateCaseStudy']);
            Route::delete('/case-study/{id}',  [\App\Http\Controllers\Api\Professional\MarketplaceController::class, 'deleteCaseStudy']);
        });
            // ── Agent 1 : Chef de Compte ──────────────────────────────────
        // Whisper (openai/whisper-large-v3) + Mistral 7B + spaCy + ReportLab
        Route::prefix('agents/account-manager')->group(function () {
            Route::post('/upload',   [\App\Http\Controllers\Api\Professional\Agents\AccountManagerController::class, 'upload'])->middleware('agent:account-manager');
            Route::get('/',          [\App\Http\Controllers\Api\Professional\Agents\AccountManagerController::class, 'index']);
            Route::get('/{id}',      [\App\Http\Controllers\Api\Professional\Agents\AccountManagerController::class, 'show']);
            Route::get('/{id}/status',[\App\Http\Controllers\Api\Professional\Agents\AccountManagerController::class, 'status']);
            Route::get('/{id}/pdf',  [\App\Http\Controllers\Api\Professional\Agents\AccountManagerController::class, 'downloadPdf']);
        });

        // ── Agent 2 : Gestionnaire de RS ─────────────────────────────
    // Prophet + Twitter-RoBERTa + Mistral 7B + Meta Graph API v21
    Route::prefix('agents/social-manager')->group(function () {
        Route::get('/accounts',                            [\App\Http\Controllers\Api\Professional\Agents\SocialManagerController::class, 'accounts']);
        Route::get('/connectable-accounts',                [\App\Http\Controllers\Api\Professional\Agents\SocialManagerController::class, 'connectableAccounts']);
        Route::post('/connect',                            [\App\Http\Controllers\Api\Professional\Agents\SocialManagerController::class, 'connect']);
        Route::get('/optimal-slots/{account_id}',          [\App\Http\Controllers\Api\Professional\Agents\SocialManagerController::class, 'optimalSlots']);
        Route::get('/inbox',                               [\App\Http\Controllers\Api\Professional\Agents\SocialManagerController::class, 'inbox']);
        Route::post('/comments/{id}/generate-reply',       [\App\Http\Controllers\Api\Professional\Agents\SocialManagerController::class, 'generateReply'])->middleware('agent:social-manager');
        Route::post('/comments/{id}/approve',              [\App\Http\Controllers\Api\Professional\Agents\SocialManagerController::class, 'approveReply']);
        Route::get('/queue',                               [\App\Http\Controllers\Api\Professional\Agents\SocialManagerController::class, 'queue']);
        Route::post('/queue',                              [\App\Http\Controllers\Api\Professional\Agents\SocialManagerController::class, 'addToQueue']);
        Route::delete('/queue/{id}',                       [\App\Http\Controllers\Api\Professional\Agents\SocialManagerController::class, 'removeFromQueue']);
        Route::get('/metrics/{account_id}',                [\App\Http\Controllers\Api\Professional\Agents\SocialManagerController::class, 'metrics']);
    });
        // ── Agent 3 : Stratège de Contenu ────────────────────────────
        // BERTopic + LDA + TF-IDF + KMeans + Mistral 7B + ReportLab
        Route::prefix('agents/content-strategy')->group(function () {
            Route::post('/generate',  [\App\Http\Controllers\Api\Professional\Agents\ContentStrategistController::class, 'generate'])->middleware('agent:content-strategy');
            Route::get('/',           [\App\Http\Controllers\Api\Professional\Agents\ContentStrategistController::class, 'index']);
            Route::get('/{id}',       [\App\Http\Controllers\Api\Professional\Agents\ContentStrategistController::class, 'show']);
            Route::get('/{id}/pdf',   [\App\Http\Controllers\Api\Professional\Agents\ContentStrategistController::class, 'downloadPdf']);
            Route::delete('/{id}',    [\App\Http\Controllers\Api\Professional\Agents\ContentStrategistController::class, 'destroy']);
        });
            // ── Agent 4 : Créateur de Contenu IA ─────────────────────────
        // Mistral 7B (légende+script) + SDXL-Turbo (image) + ReportLab + Meta Graph API v21
        Route::prefix('agents/content-creator')->group(function () {
            // Génération + consultation
            Route::post('/generate',           [\App\Http\Controllers\Api\Professional\Agents\ContentCreatorController::class, 'generate'])->middleware('agent:content-creator');
            Route::get('/',                    [\App\Http\Controllers\Api\Professional\Agents\ContentCreatorController::class, 'index']);
            Route::get('/{id}',                [\App\Http\Controllers\Api\Professional\Agents\ContentCreatorController::class, 'show']);
            Route::delete('/{id}',             [\App\Http\Controllers\Api\Professional\Agents\ContentCreatorController::class, 'destroy']);

            // Téléchargements
            Route::get('/{id}/download/image', [\App\Http\Controllers\Api\Professional\Agents\ContentCreatorController::class, 'downloadImage']);
            Route::get('/{id}/download/pdf',   [\App\Http\Controllers\Api\Professional\Agents\ContentCreatorController::class, 'downloadPdf']);

            // Workflow d'approbation
            Route::post('/{id}/approve',       [\App\Http\Controllers\Api\Professional\Agents\ContentCreatorPublishController::class, 'approve']);
            Route::post('/{id}/reject',        [\App\Http\Controllers\Api\Professional\Agents\ContentCreatorPublishController::class, 'reject']);
            Route::post('/{id}/publish',       [\App\Http\Controllers\Api\Professional\Agents\ContentCreatorPublishController::class, 'publish']);
        });

            // ── Agent 5 : Analytics IA ────────────────────────────────────
    // Prophet + XGBoost + Random Forest + Matplotlib + ReportLab
    // Meta Graph API v21 (collecte /6h) · an_metrics · an_reports
    Route::prefix('agents/analytics')->group(function () {
        Route::get('/dashboard',              [\App\Http\Controllers\Api\Professional\Agents\AnalyticsController::class, 'dashboard']);
        Route::post('/collect',               [\App\Http\Controllers\Api\Professional\Agents\AnalyticsController::class, 'collect']);
        Route::post('/predict',               [\App\Http\Controllers\Api\Professional\Agents\AnalyticsController::class, 'predict'])->middleware('agent:analytics');
        Route::get('/reports',                [\App\Http\Controllers\Api\Professional\Agents\AnalyticsController::class, 'reports']);
        Route::get('/reports/{id}/download',  [\App\Http\Controllers\Api\Professional\Agents\AnalyticsController::class, 'downloadReport']);
    });

        // ── Agent 6 : Optimisation Publicitaire ──────────────────────
    // XGBoost CTR + RF/GB Segments + SciPy linprog + Q-Learning
    // Meta Ads API v21 · Google Ads API GAQL · ao_campaigns · ao_reports
    Route::prefix('agents/ad-optimizer')->group(function () {
        Route::get('/connectable-accounts', [\App\Http\Controllers\Api\Professional\Agents\AdOptimizerController::class, 'connectableAccounts']);
        Route::post('/connect',             [\App\Http\Controllers\Api\Professional\Agents\AdOptimizerController::class, 'connect']);
        Route::post('/analyze',             [\App\Http\Controllers\Api\Professional\Agents\AdOptimizerController::class, 'analyze'])->middleware('agent:ad-optimizer');
        Route::post('/collect',             [\App\Http\Controllers\Api\Professional\Agents\AdOptimizerController::class, 'collect']);
        Route::post('/predict-ctr',         [\App\Http\Controllers\Api\Professional\Agents\AdOptimizerController::class, 'predictCTR']);
        Route::post('/bid-recommendation',  [\App\Http\Controllers\Api\Professional\Agents\AdOptimizerController::class, 'bidRecommendation']);
        Route::get('/reports',              [\App\Http\Controllers\Api\Professional\Agents\AdOptimizerController::class, 'reports']);
        Route::get('/reports/{id}/download',[\App\Http\Controllers\Api\Professional\Agents\AdOptimizerController::class, 'downloadReport']);
    });

        // ── Agent 7 : Veille Concurrentielle ─────────────────────────
    // VADER + TextBlob + NLTK + K-Means + DBSCAN + TF-IDF + Mistral 7B
    // Meta Graph API v21 + Playwright · ci_competitor_accounts · ci_competitor_posts · ci_reports
    Route::prefix('agents/competitive-intel')->group(function () {
        Route::get('/competitors',           [\App\Http\Controllers\Api\Professional\Agents\CompetitiveIntelController::class, 'index']);
        Route::post('/competitors',          [\App\Http\Controllers\Api\Professional\Agents\CompetitiveIntelController::class, 'store']);
        Route::delete('/competitors/{id}',   [\App\Http\Controllers\Api\Professional\Agents\CompetitiveIntelController::class, 'destroy']);
        Route::post('/analyze',              [\App\Http\Controllers\Api\Professional\Agents\CompetitiveIntelController::class, 'analyze'])->middleware('agent:competitive-intel');
        Route::post('/collect',              [\App\Http\Controllers\Api\Professional\Agents\CompetitiveIntelController::class, 'collect']);
        Route::get('/reports',               [\App\Http\Controllers\Api\Professional\Agents\CompetitiveIntelController::class, 'reports']);
    });
                

    });

    // ── Panneau Admin ─────────────────────────────────────────────
    // role:admin -> 2fa (mandatory, verified session) -> route.
    // Toute action mutante appelle AdminAuditLogService::log() (voir §13 spec admin).
    Route::middleware(['role:admin', '2fa'])
        ->prefix('admin')
        ->group(function () {
            Route::get('/dashboard', [\App\Http\Controllers\Api\Admin\DashboardController::class, 'index']);

            Route::prefix('users')->group(function () {
                Route::get('/',                    [\App\Http\Controllers\Api\Admin\UserManagementController::class, 'index']);
                Route::get('/{id}',                [\App\Http\Controllers\Api\Admin\UserManagementController::class, 'show']);
                Route::patch('/{id}/role',          [\App\Http\Controllers\Api\Admin\UserManagementController::class, 'changeRole']);
                Route::post('/{id}/suspend',        [\App\Http\Controllers\Api\Admin\UserManagementController::class, 'suspend']);
                Route::post('/{id}/unsuspend',      [\App\Http\Controllers\Api\Admin\UserManagementController::class, 'unsuspend']);
                Route::post('/{id}/ban',            [\App\Http\Controllers\Api\Admin\UserManagementController::class, 'ban'])
                    ->middleware('2fa.recent');
                Route::post('/{id}/password-reset', [\App\Http\Controllers\Api\Admin\UserManagementController::class, 'triggerPasswordReset']);
                Route::delete('/{id}',              [\App\Http\Controllers\Api\Admin\UserManagementController::class, 'requestDeletion'])
                    ->middleware('2fa.recent');

                // ── Abonnement d'un utilisateur (Phase 5) ──────────
                Route::post('/{id}/subscription/change-plan', [\App\Http\Controllers\Api\Admin\SubscriptionManagementController::class, 'changePlan'])
                    ->middleware('2fa.recent');
                Route::post('/{id}/subscription/promotion',   [\App\Http\Controllers\Api\Admin\SubscriptionManagementController::class, 'applyPromotion']);
            });

            // ── Abonnements & facturation (Phase 5) ────────────────
            Route::prefix('subscriptions')->group(function () {
                Route::get('/',         [\App\Http\Controllers\Api\Admin\SubscriptionManagementController::class, 'index']);
                Route::get('/metrics',  [\App\Http\Controllers\Api\Admin\SubscriptionManagementController::class, 'metrics']);
            });

            Route::post('/invoices/{id}/refund', [\App\Http\Controllers\Api\Admin\SubscriptionManagementController::class, 'refund'])
                ->middleware('2fa.recent');

            // ── Gestion des plans (Phase 5) ─────────────────────────
            Route::prefix('plans')->group(function () {
                Route::get('/',            [\App\Http\Controllers\Api\Admin\PlanManagementController::class, 'index']);
                Route::post('/',           [\App\Http\Controllers\Api\Admin\PlanManagementController::class, 'store'])
                    ->middleware('2fa.recent');
                Route::patch('/{id}',      [\App\Http\Controllers\Api\Admin\PlanManagementController::class, 'update'])
                    ->middleware('2fa.recent');
                Route::post('/{id}/archive', [\App\Http\Controllers\Api\Admin\PlanManagementController::class, 'archive'])
                    ->middleware('2fa.recent');
            });

            // ── Monitoring des agents IA (Phase 6) ──────────────────
            Route::prefix('ai-agents')->group(function () {
                Route::get('/',              [\App\Http\Controllers\Api\Admin\AiAgentController::class, 'index']);
                Route::get('/logs',          [\App\Http\Controllers\Api\Admin\AiAgentController::class, 'logs']);
                Route::get('/costs',         [\App\Http\Controllers\Api\Admin\AiAgentController::class, 'costs']);
                Route::get('/{slug}',        [\App\Http\Controllers\Api\Admin\AiAgentController::class, 'show']);
                Route::post('/{slug}/toggle',[\App\Http\Controllers\Api\Admin\AiAgentController::class, 'toggle'])
                    ->middleware('2fa.recent');
                Route::get('/{slug}/config', [\App\Http\Controllers\Api\Admin\AiAgentController::class, 'getConfig']);
                Route::patch('/{slug}/config',[\App\Http\Controllers\Api\Admin\AiAgentController::class, 'updateConfig'])
                    ->middleware('2fa.recent');
            });
        });
});