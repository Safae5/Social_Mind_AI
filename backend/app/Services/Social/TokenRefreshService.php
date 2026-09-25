<?php

namespace App\Services\Social;

use App\Models\SocialAccount;
use Illuminate\Support\Facades\Log;

class TokenRefreshService
{
    public function __construct(
        private readonly MetaOAuthService   $metaService,
        private readonly TikTokOAuthService $tiktokService,
    ) {}

    /**
     * Renouvelle le token si nécessaire.
     * Appelé par le scheduler toutes les heures.
     */
    public function refreshIfNeeded(SocialAccount $account): bool
    {
        if (!$account->isTokenExpiringSoon(24)) {
            return false;
        }

        try {
            return match($account->platform) {
                'instagram', 'facebook' => $this->refreshMetaToken($account),
                'tiktok'               => $this->refreshTikTokToken($account),
                default => false,
            };
        } catch (\Exception $e) {
            Log::error("Token refresh failed for account {$account->id}", [
                'error' => $e->getMessage(),
            ]);
            $account->markTokenInvalid($e->getMessage());
            return false;
        }
    }

    private function refreshMetaToken(SocialAccount $account): bool
    {
        $currentToken = $account->getDecryptedAccessToken();
        if (!$currentToken) return false;

        // Meta Long-Lived Tokens — renouvellement possible
        $newTokenData = $this->metaService->exchangeForLongLivedToken($currentToken);

        $account->update([
            'access_token'      => $newTokenData['access_token'],
            'token_expires_at'  => now()->addDays(60),
            'token_refreshed_at'=> now(),
            'token_valid'       => true,
            'token_error'       => null,
        ]);

        return true;
    }

    private function refreshTikTokToken(SocialAccount $account): bool
    {
        $refreshToken = $account->getDecryptedRefreshToken();
        if (!$refreshToken) return false;

        $newTokenData = $this->tiktokService->refreshAccessToken($refreshToken);

        $account->update([
            'access_token'      => $newTokenData['access_token'],
            'refresh_token'     => $newTokenData['refresh_token'] ?? $refreshToken,
            'token_expires_at'  => now()->addSeconds($newTokenData['expires_in'] ?? 86400),
            'token_refreshed_at'=> now(),
            'token_valid'       => true,
            'token_error'       => null,
        ]);

        return true;
    }
}