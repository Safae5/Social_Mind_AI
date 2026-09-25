<?php

namespace App\Services\Auth;

use App\Models\EmailVerificationToken;
use App\Models\User;
use App\Notifications\Auth\VerifyEmailNotification;
use App\Notifications\Auth\WelcomeNotification;

class EmailVerificationService
{
    // ── Vérifie le token et active le compte ──────────────────────
    public function verify(string $token, string $email): User
    {
        $user = User::where('email', $email)->firstOrFail();

        $verificationToken = EmailVerificationToken::where('user_id', $user->id)
            ->where('token', $token)
            ->first();

        if (!$verificationToken) {
            throw new \Exception('Token de vérification invalide.', 400);
        }

        if (!$verificationToken->isValid()) {
            throw new \Exception('Le lien de vérification a expiré. Demandez-en un nouveau.', 400);
        }

        // Active le compte
        $user->update([
            'email_verified_at' => now(),
            'status'            => 'active',
        ]);

        // Marque le token comme utilisé
        $verificationToken->markAsUsed();

        // Envoie l'email de bienvenue
        $user->notify(new WelcomeNotification($user->first_name, $user->role));

        return $user;
    }

    // ── Renvoi du lien de vérification ───────────────────────────
    public function resend(string $email): void
    {
        $user = User::where('email', $email)->firstOrFail();

        if ($user->isEmailVerified()) {
            throw new \Exception('Cet e-mail est déjà vérifié.', 400);
        }

        // Vérifie le rate limiting : pas plus d'un email par 2 minutes
        $lastToken = EmailVerificationToken::where('user_id', $user->id)
            ->latest()
            ->first();

        if ($lastToken && $lastToken->created_at->diffInMinutes(now()) < 2) {
            throw new \Exception('Veuillez attendre 2 minutes avant de renvoyer.', 429);
        }

        $token = EmailVerificationToken::generateFor($user);
        $user->notify(new VerifyEmailNotification($token->token, $user->first_name));
    }
}