<?php

namespace App\Services\Social;

use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class TikTokOAuthService
{
    private string $clientKey;
    private string $clientSecret;
    private string $redirectUri;
    private string $apiBase = 'https://open.tiktokapis.com/v2';

    public function __construct()
    {
        $this->clientKey    = config('services.tiktok.client_key');
        $this->clientSecret = config('services.tiktok.client_secret');
        $this->redirectUri  = config('services.tiktok.redirect_uri');
    }

    // ── URL d'autorisation TikTok ──────────────────────────────
    // Retourne le code_verifier au lieu de l'écrire en session : cet
    // endpoint est appelé en JSON/axios avec withCredentials=false (JWT,
    // pas cookies), donc un Set-Cookie de session ici n'atteint jamais le
    // navigateur — le contrôleur doit le mémoriser lui-même (Cache, keyé
    // par $state) comme pour MetaOAuthController.
    public function buildAuthUrl(string $state): array
    {
        $codeVerifier  = Str::random(64);
        $codeChallenge = rtrim(strtr(base64_encode(hash('sha256', $codeVerifier, true)), '+/', '-_'), '=');

        $scopes = 'user.info.basic,video.list,video.publish';

        $authUrl = 'https://www.tiktok.com/v2/auth/authorize/?' . http_build_query([
            'client_key'            => $this->clientKey,
            'response_type'         => 'code',
            'scope'                 => $scopes,
            'redirect_uri'          => $this->redirectUri,
            'state'                 => $state,
            'code_challenge'        => $codeChallenge,
            'code_challenge_method' => 'S256',
        ]);

        return ['auth_url' => $authUrl, 'code_verifier' => $codeVerifier];
    }

    // ── Échange code → token ────────────────────────────────────
    public function exchangeCodeForToken(string $code, string $codeVerifier): array
    {
        // ->asForm() est obligatoire : l'endpoint TikTok rejette tout ce qui
        // n'est pas application/x-www-form-urlencoded (confirmé en direct :
        // {"error":"invalid_request","error_description":"Only
        // `application/x-www-form-urlencoded` is accepted as Content-Type."}
        // — mais avec un HTTP 200, donc ->successful() ne l'attrapait pas
        // non plus, jusqu'à planter plus loin sur $tokenData['access_token']
        // manquant avec une erreur PHP illisible pour l'utilisateur.
        $response = Http::asForm()->post('https://open.tiktokapis.com/v2/oauth/token/', [
            'client_key'    => $this->clientKey,
            'client_secret' => $this->clientSecret,
            'code'          => $code,
            'grant_type'    => 'authorization_code',
            'redirect_uri'  => $this->redirectUri,
            'code_verifier' => $codeVerifier,
        ]);

        $data = $response->json();

        if (!$response->successful() || isset($data['error']) || !isset($data['access_token'])) {
            throw new \Exception('TikTok token exchange failed: ' . $response->body());
        }

        return $data;
    }

    // ── Refresh token ───────────────────────────────────────────
    public function refreshAccessToken(string $refreshToken): array
    {
        $response = Http::asForm()->post('https://open.tiktokapis.com/v2/oauth/token/', [
            'client_key'    => $this->clientKey,
            'client_secret' => $this->clientSecret,
            'grant_type'    => 'refresh_token',
            'refresh_token' => $refreshToken,
        ]);

        $data = $response->json();

        if (!$response->successful() || isset($data['error']) || !isset($data['access_token'])) {
            throw new \Exception('TikTok refresh failed: ' . $response->body());
        }

        return $data;
    }

    // ── Profil utilisateur TikTok ───────────────────────────────
    public function getUserInfo(string $accessToken): array
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$accessToken}",
        ])->get("{$this->apiBase}/user/info/", [
            'fields' => 'open_id,union_id,avatar_url,display_name,username,follower_count,following_count,video_count',
        ]);

        if (!$response->successful()) {
            throw new \Exception('TikTok user info failed');
        }

        return $response->json()['data']['user'] ?? [];
    }

    // ── Sauvegarde le compte TikTok ─────────────────────────────
    public function saveTikTokAccount(User $user, array $tokenData, array $userInfo): SocialAccount
    {
        // updateOrCreateWithTrashed() — voir SocialAccount::updateOrCreateWithTrashed()
        // et le commentaire équivalent dans MetaOAuthService::saveInstagramAccount().
        return SocialAccount::updateOrCreateWithTrashed(
            [
                'user_id'          => $user->id,
                'platform'         => 'tiktok',
                'platform_user_id' => $userInfo['open_id'],
            ],
            [
                // Même correctif que MetaOAuthService — 'provider' hérite
                // de la contrainte unique(user_id, provider) de la table
                // de login OAuth et n'était jamais renseigné ici.
                'provider'             => 'platform_tiktok',
                'platform_username'    => $userInfo['username'] ?? $userInfo['display_name'] ?? '',
                'platform_display_name'=> $userInfo['display_name'] ?? '',
                'platform_avatar_url'  => $userInfo['avatar_url'] ?? null,
                'access_token'         => $tokenData['access_token'],
                'refresh_token'        => $tokenData['refresh_token'] ?? null,
                'token_expires_at'     => now()->addSeconds($tokenData['expires_in'] ?? 86400),
                'token_refreshed_at'   => now(),
                'followers_count'      => $userInfo['follower_count'] ?? 0,
                'following_count'      => $userInfo['following_count'] ?? 0,
                'posts_count'          => $userInfo['video_count'] ?? 0,
                'account_type'         => 'creator',
                'is_active'            => true,
                'token_valid'          => true,
                'granted_permissions'  => ['user.info.basic', 'video.list', 'video.publish'],
            ]
        );
    }
}