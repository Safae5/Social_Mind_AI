<?php

namespace App\Services\Social;

use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Support\Facades\Http;

/**
 * "Instagram API with Instagram Login" — produit Meta séparé de la Facebook
 * Login utilisée par MetaOAuthService : pas de Page Facebook liée, jeton et
 * espace d'ID incompatibles avec graph.facebook.com (confirmé en direct :
 * un jeton Instagram Login est rejeté par graph.facebook.com avec "Cannot
 * parse access token"). Les trois hôtes ci-dessous sont réels et distincts,
 * pas des variantes d'un même service :
 *   - instagram.com          → écran d'autorisation
 *   - api.instagram.com      → échange code → jeton court (POST form-encodé)
 *   - graph.instagram.com    → échange long-lived + tous les appels Graph
 */
class InstagramDirectOAuthService
{
    private string $appId;
    private string $appSecret;
    private string $graphVersion;
    private string $graphBase;
    private string $redirectUri;

    public function __construct()
    {
        $this->appId        = config('services.instagram_direct.app_id');
        $this->appSecret    = config('services.instagram_direct.app_secret');
        $this->graphVersion = config('services.instagram_direct.graph_version', 'v21.0');
        $this->graphBase    = "https://graph.instagram.com/{$this->graphVersion}";
        $this->redirectUri  = config('services.instagram_direct.redirect_uri');
    }

    // ── Étape 1 : Construire l'URL d'autorisation ─────────────
    public function buildAuthUrl(string $state): string
    {
        $scopes = implode(',', [
            'instagram_business_basic',
            'instagram_business_content_publish',
            'instagram_business_manage_messages',
            'instagram_business_manage_comments',
            'instagram_business_manage_insights',
        ]);

        return 'https://www.instagram.com/oauth/authorize?' . http_build_query([
            'client_id'     => $this->appId,
            'redirect_uri'  => $this->redirectUri,
            'scope'         => $scopes,
            'response_type' => 'code',
            'state'         => $state,
        ]);
    }

    // ── Étape 2 : Échanger le code contre un jeton court (1h) ──
    public function exchangeCodeForToken(string $code): array
    {
        // Meta ajoute un "#_" en fin de code sur ce flux — confirmé dans la
        // documentation officielle Instagram Login ; l'échange échoue si on
        // ne le retire pas.
        $code = rtrim($code, '#_');

        $response = Http::asForm()->post('https://api.instagram.com/oauth/access_token', [
            'client_id'     => $this->appId,
            'client_secret' => $this->appSecret,
            'grant_type'    => 'authorization_code',
            'redirect_uri'  => $this->redirectUri,
            'code'          => $code,
        ]);

        if (!$response->successful()) {
            throw new \Exception('Échange de code Instagram échoué : ' . $response->body());
        }

        $data = $response->json(); // access_token (court, 1h), user_id

        return $this->exchangeForLongLivedToken($data['access_token']);
    }

    // ── Long-Lived Token (60 jours) ───────────────────────────
    public function exchangeForLongLivedToken(string $shortToken): array
    {
        $response = Http::get("{$this->graphBase}/access_token", [
            'grant_type'    => 'ig_exchange_token',
            'client_secret' => $this->appSecret,
            'access_token'  => $shortToken,
        ]);

        if (!$response->successful()) {
            throw new \Exception('Échange Long-Lived Token Instagram échoué : ' . $response->body());
        }

        return $response->json(); // access_token, token_type, expires_in (secondes, ~60 jours)
    }

    // ── Profil du compte Instagram connecté ───────────────────
    public function getProfile(string $accessToken): array
    {
        $response = Http::get("{$this->graphBase}/me", [
            'fields'       => 'id,username,account_type,followers_count,media_count',
            'access_token' => $accessToken,
        ]);

        if (!$response->successful()) {
            throw new \Exception('Récupération profil Instagram échouée : ' . $response->body());
        }

        return $response->json();
    }

    // ── Sauvegarde le compte en base ───────────────────────────
    public function saveAccount(User $user, array $profile, array $tokenData): SocialAccount
    {
        $expiresAt = isset($tokenData['expires_in'])
            ? now()->addSeconds((int) $tokenData['expires_in'])
            : now()->addDays(60);

        return SocialAccount::updateOrCreateWithTrashed(
            [
                'user_id'          => $user->id,
                'platform'         => 'instagram',
                'platform_user_id' => $profile['id'],
            ],
            [
                // 'platform_instagram_direct' distingue ce compte de celui
                // connecté via Facebook Login (provider 'platform_instagram')
                // — voir SocialAccount::isInstagramDirectLogin(). Sans cette
                // distinction, les Jobs ne sauraient pas router vers
                // graph.instagram.com au lieu de graph.facebook.com.
                'provider'             => 'platform_instagram_direct',
                'platform_username'    => $profile['username'] ?? '',
                'platform_display_name'=> $profile['username'] ?? '',
                'access_token'         => $tokenData['access_token'],
                // Pas de Page Facebook dans ce flux — page_access_token reste
                // null volontairement ; getDecryptedPageAccessToken() ??
                // getDecryptedAccessToken() retombe déjà proprement sur
                // access_token pour ces comptes (même pattern que partout
                // ailleurs dans le code).
                'page_access_token'    => null,
                'page_id'              => null,
                'page_name'            => null,
                'token_expires_at'     => $expiresAt,
                'token_refreshed_at'   => now(),
                'followers_count'      => $profile['followers_count'] ?? 0,
                'posts_count'          => $profile['media_count'] ?? 0,
                'account_type'         => $profile['account_type'] ?? 'business',
                'is_active'            => true,
                'token_valid'          => true,
            ]
        );
    }
}
