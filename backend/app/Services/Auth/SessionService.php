<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Models\UserSession;
use Carbon\Carbon;

class SessionService
{
    // ── Crée une session lors de la connexion ─────────────────────
    public function createSession(
    User   $user,
    string $tokenId,
    string $ip,
    string $userAgent,
    Carbon $expiration
): UserSession {

    // Désactive les sessions précédentes
    UserSession::where('user_id', $user->id)
        ->update(['is_current' => false]);

    $deviceInfo = $this->parseUserAgent($userAgent);

    return UserSession::create([
        'user_id'        => $user->id,
        'token_id'       => (string) $tokenId,  // ← cast string
        'device_type'    => $deviceInfo['device_type'],
        'device_name'    => $deviceInfo['device_name'],
        'browser'        => $deviceInfo['browser'],
        'os'             => $deviceInfo['os'],
        'ip_address'     => $ip,
        'location'       => null,
        'is_current'     => true,
        'last_active_at' => now(),
        'expires_at'     => $expiration,
    ]);
}

    // ── Termine la session courante ───────────────────────────────
    public function endCurrentSession(User $user): void
    {
        UserSession::where('user_id', $user->id)
            ->where('is_current', true)
            ->delete();
    }

    // ── Parse le User-Agent pour extraire les infos appareil ──────
    private function parseUserAgent(string $userAgent): array
    {
        $browser    = 'Inconnu';
        $os         = 'Inconnu';
        $deviceType = 'desktop';

        // Détection navigateur
        if (str_contains($userAgent, 'Chrome') && !str_contains($userAgent, 'Edg'))
            $browser = 'Chrome';
        elseif (str_contains($userAgent, 'Firefox'))
            $browser = 'Firefox';
        elseif (str_contains($userAgent, 'Safari') && !str_contains($userAgent, 'Chrome'))
            $browser = 'Safari';
        elseif (str_contains($userAgent, 'Edg'))
            $browser = 'Edge';

        // Détection OS
        if (str_contains($userAgent, 'Windows'))      $os = 'Windows';
        elseif (str_contains($userAgent, 'Macintosh'))$os = 'macOS';
        elseif (str_contains($userAgent, 'Linux'))    $os = 'Linux';
        elseif (str_contains($userAgent, 'Android'))  { $os = 'Android'; $deviceType = 'mobile'; }
        elseif (str_contains($userAgent, 'iPhone'))   { $os = 'iOS'; $deviceType = 'mobile'; }
        elseif (str_contains($userAgent, 'iPad'))     { $os = 'iPadOS'; $deviceType = 'tablet'; }

        return [
            'device_type' => $deviceType,
            'device_name' => "{$browser} on {$os}",
            'browser'     => $browser,
            'os'          => $os,
        ];
    }
}