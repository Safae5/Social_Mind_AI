<?php

use App\Http\Controllers\Api\Auth\OAuthController;
use App\Http\Controllers\Api\Auth\MetaOAuthController;
use App\Http\Controllers\Api\Auth\TikTokOAuthController;
use App\Http\Controllers\Api\Auth\InstagramDirectOAuthController;
use Illuminate\Support\Facades\Route;

// ── Page principale (React gère le routing) ───────────────────
Route::get('/', function () {
    return view('welcome');
});

// ══════════════════════════════════════════════════════════════
// Routes OAuth — doivent être dans web.php car Socialite
// nécessite les sessions qui ne sont pas disponibles en API
// ══════════════════════════════════════════════════════════════
Route::prefix('api/auth')->group(function () {

    // ── Google ────────────────────────────────────────────────
    Route::get('/google', [OAuthController::class, 'redirectToGoogle'])
        ->name('auth.google');

    Route::get('/google/callback', [OAuthController::class, 'handleGoogleCallback'])
        ->name('auth.google.callback');

    // ── Facebook ──────────────────────────────────────────────
    Route::get('/facebook', [OAuthController::class, 'redirectToFacebook'])
        ->name('auth.facebook');

    Route::get('/facebook/callback', [OAuthController::class, 'handleFacebookCallback'])
        ->name('auth.facebook.callback');

    // Meta OAuth callback
    Route::get('/oauth/meta/callback',   [MetaOAuthController::class, 'callback'])
        ->name('oauth.meta.callback');    
        
    // TikTok OAuth callback
    Route::get('/oauth/tiktok/callback', [TikTokOAuthController::class, 'callback'])
        ->name('oauth.tiktok.callback');
});

// ══════════════════════════════════════════════════════════════
// Alias exacts de META_REDIRECT_URI / TIKTOK_REDIRECT_URI (.env) —
// ces valeurs ne correspondaient à aucune route enregistrée
// ci-dessus (/api/meta/callback ≠ /api/auth/oauth/meta/callback,
// /oauth/tiktok/callback ≠ /api/auth/oauth/tiktok/callback), donc
// Meta/TikTok renvoyaient vers une URL qui 404ait après le premier
// écran d'autorisation. On ajoute les routes réellement configurées
// plutôt que de changer .env, qui doit correspondre à ce qui est
// enregistré côté Meta/TikTok Developer Console.
// ══════════════════════════════════════════════════════════════
Route::get('/api/meta/callback', [MetaOAuthController::class, 'callback'])
    ->name('oauth.meta.callback.configured');

Route::get('/oauth/tiktok/callback', [TikTokOAuthController::class, 'callback'])
    ->name('oauth.tiktok.callback.configured');

// Alias exact de INSTAGRAM_REDIRECT_URI (.env) — même raison que ci-dessus,
// doit correspondre exactement à l'URI enregistrée dans le tableau de bord
// Meta pour ce produit Instagram Login séparé.
Route::get('/api/instagram/callback', [InstagramDirectOAuthController::class, 'callback'])
    ->name('oauth.instagram_direct.callback');

// ══════════════════════════════════════════════════════════════
// Redirect Meta/TikTok — doivent aussi être ici : ils écrivent en
// session un état que le callback ci-dessus doit relire. auth:api
// identifie l'utilisateur (JWT) ; la session vient du groupe "web"
// appliqué par défaut aux routes de ce fichier.
// ══════════════════════════════════════════════════════════════
Route::middleware(['auth:api'])->prefix('api')->group(function () {
    Route::post('/oauth/meta/redirect',   [MetaOAuthController::class, 'redirect']);
    Route::post('/oauth/tiktok/redirect', [TikTokOAuthController::class, 'redirect']);
    Route::post('/oauth/instagram-direct/redirect', [InstagramDirectOAuthController::class, 'redirect']);
});