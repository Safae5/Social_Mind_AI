<?php

namespace App\Services\Auth;

use App\Models\TwoFactorSession;
use App\Models\User;
use BaconQrCode\Renderer\GDLibRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorService
{
    private Google2FA $google2FA;

    public function __construct()
    {
        $this->google2FA = new Google2FA();
    }

    // ══════════════════════════════════════════════════════════════
    // SETUP 2FA
    // ══════════════════════════════════════════════════════════════

    // ── Génère un nouveau secret 2FA ──────────────────────────────
    public function generateSecret(): string
    {
        return $this->google2FA->generateSecretKey(32);
    }

    // ── Génère l'URL TOTP pour Google Authenticator ───────────────
    public function generateQrCodeUrl(User $user, string $secret): string
    {
        return $this->google2FA->getQRCodeUrl(
            config('app.name', 'Social Mind AI'), // Nom de l'app
            $user->email,                          // Identifiant
            $secret                                // Secret
        );
    }

    // ── Génère le QR Code en SVG (pas besoin de GD) ───────────────
    public function generateQrCodeSvg(string $qrCodeUrl): string
    {
        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd()
        );

        $writer = new Writer($renderer);
        $svg    = $writer->writeString($qrCodeUrl);

        // Encode en base64 pour l'envoyer au frontend
        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    // ── Active la 2FA — étape 1 : prépare le setup ───────────────
    // Stocke le secret TEMPORAIREMENT (pas encore confirmé)
    public function prepareTwoFactor(User $user): array
    {
        $secret     = $this->generateSecret();
        $qrCodeUrl  = $this->generateQrCodeUrl($user, $secret);
        $qrCodeSvg  = $this->generateQrCodeSvg($qrCodeUrl);

        // Stocke le secret temporaire (pas encore activé)
        // On le confirme seulement après que l'utilisateur valide avec son OTP
        $user->update([
            'two_factor_secret'       => encrypt($secret),
            'two_factor_confirmed_at' => null,  // pas encore confirmé
        ]);

        return [
            'secret'      => $secret,
            'qr_code'     => $qrCodeSvg,
            'qr_code_url' => $qrCodeUrl,
            'manual_entry'=> [
                'account'   => $user->email,
                'key'       => $secret,
                'issuer'    => config('app.name'),
                'algorithm' => 'SHA1',
                'digits'    => 6,
                'period'    => 30,
            ],
        ];
    }

    // ── Confirme la 2FA — étape 2 : valide avec le premier OTP ───
    public function confirmTwoFactor(User $user, string $otp): bool
    {
        if (!$user->two_factor_secret) {
            return false;
        }

        $secret = decrypt($user->two_factor_secret);
        $valid  = $this->google2FA->verifyKey($secret, $otp, 1);

        if ($valid) {
            $recoveryCodes = $this->generateRecoveryCodes();

            $user->update([
                'two_factor_enabled'          => true,
                'two_factor_confirmed_at'     => now(),
                'two_factor_recovery_codes'   => $recoveryCodes,
            ]);
        }

        return $valid;
    }

    // ── Désactive la 2FA ──────────────────────────────────────────
    public function disableTwoFactor(User $user, string $otp): bool
    {
        // Vérifie le code OTP avant de désactiver
        if (!$this->verifyOtp($user, $otp)) {
            return false;
        }

        $user->update([
            'two_factor_enabled'        => false,
            'two_factor_secret'         => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at'   => null,
        ]);

        // Supprime toutes les sessions 2FA
        $user->twoFactorSessions()->delete();

        return true;
    }

    // ══════════════════════════════════════════════════════════════
    // VÉRIFICATION OTP
    // ══════════════════════════════════════════════════════════════

    // ── Vérifie un code OTP (6 chiffres) ─────────────────────────
    public function verifyOtp(User $user, string $otp): bool
    {
        if (!$user->two_factor_secret) {
            return false;
        }

        $secret = decrypt($user->two_factor_secret);
        return $this->google2FA->verifyKey($secret, $otp, 1);
    }

    // ── Vérifie un code de récupération ──────────────────────────
    public function verifyRecoveryCode(User $user, string $code): bool
    {
        $codes = $user->two_factor_recovery_codes ?? [];

        // Cherche le code dans la liste
        $normalizedInput = strtoupper(str_replace('-', '', $code));

        foreach ($codes as $index => $storedCode) {
            $normalizedStored = strtoupper(str_replace('-', '', $storedCode));

            if (hash_equals($normalizedStored, $normalizedInput)) {
                // Supprime le code utilisé (usage unique)
                unset($codes[$index]);
                $user->update([
                    'two_factor_recovery_codes' => array_values($codes),
                ]);
                return true;
            }
        }

        return false;
    }

    // ══════════════════════════════════════════════════════════════
    // SESSIONS 2FA
    // ══════════════════════════════════════════════════════════════

    // ── Crée une session 2FA après vérification réussie ──────────
    public function createTwoFactorSession(
        User   $user,
        string $ip,
        string $userAgent
    ): string {
        // Supprime les anciennes sessions 2FA de cet utilisateur
        TwoFactorSession::where('user_id', $user->id)
            ->where('expires_at', '<', now())
            ->delete();

        $sessionToken = Str::random(64);

        TwoFactorSession::create([
            'user_id'       => $user->id,
            'session_token' => $sessionToken,
            'ip_address'    => $ip,
            'user_agent'    => $userAgent,
            'verified_at'   => now(),
            'expires_at'    => now()->addHours(8), // session 2FA dure 8h
        ]);

        return $sessionToken;
    }

    // ── Vérifie si une session 2FA est valide ─────────────────────
    public function validateTwoFactorSession(
        User   $user,
        string $sessionToken
    ): bool {
        $session = TwoFactorSession::where('user_id', $user->id)
            ->where('session_token', $sessionToken)
            ->first();

        if (!$session || !$session->isValid()) {
            return false;
        }

        return true;
    }

    // ── Révoque une session 2FA ───────────────────────────────────
    public function revokeTwoFactorSession(User $user, string $token): void
    {
        TwoFactorSession::where('user_id', $user->id)
            ->where('session_token', $token)
            ->delete();
    }

    // ══════════════════════════════════════════════════════════════
    // CODES DE RÉCUPÉRATION
    // ══════════════════════════════════════════════════════════════

    // ── Génère 8 codes de récupération ───────────────────────────
    public function generateRecoveryCodes(): array
    {
        $codes = [];
        for ($i = 0; $i < 8; $i++) {
            // Format : XXXX-XXXX-XXXX (12 caractères)
            $codes[] = strtoupper(
                Str::random(4) . '-' .
                Str::random(4) . '-' .
                Str::random(4)
            );
        }
        return $codes;
    }

    // ── Régénère les codes de récupération ───────────────────────
    public function regenerateRecoveryCodes(User $user, string $otp): array
    {
        if (!$this->verifyOtp($user, $otp)) {
            throw new \Exception('Code OTP invalide.', 400);
        }

        $newCodes = $this->generateRecoveryCodes();
        $user->update(['two_factor_recovery_codes' => $newCodes]);

        return $newCodes;
    }

    // ── Compte les codes de récupération restants ─────────────────
    public function remainingRecoveryCodes(User $user): int
    {
        return count($user->two_factor_recovery_codes ?? []);
    }
}