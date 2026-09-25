<?php

namespace App\Services\Auth;

use App\Models\PasswordResetToken;
use App\Models\User;
use App\Notifications\Auth\ResetPasswordNotification;
use Illuminate\Support\Facades\Hash;

class PasswordResetService
{
    // ── Envoie le lien de réinitialisation ───────────────────────
    public function sendResetLink(string $email): void
    {
        $user = User::where('email', $email)->firstOrFail();

        // Rate limiting : 1 email toutes les 2 minutes
        $existing = PasswordResetToken::where('email', $email)
            ->latest()
            ->first();

        if ($existing && $existing->created_at->diffInMinutes(now()) < 2) {
            throw new \Exception('Veuillez attendre 2 minutes avant de réessayer.', 429);
        }

        $resetToken = PasswordResetToken::generateFor($email);
        $user->notify(new ResetPasswordNotification($resetToken->token, $user->first_name));
    }

    // ── Réinitialise le mot de passe ─────────────────────────────
    public function reset(string $token, string $email, string $password): void
    {
        $resetToken = PasswordResetToken::where('email', $email)
            ->where('token', $token)
            ->first();

        if (!$resetToken || !$resetToken->isValid()) {
            throw new \Exception('Le lien de réinitialisation est invalide ou expiré.', 400);
        }

        $user = User::where('email', $email)->firstOrFail();

        // Met à jour le mot de passe
        $user->update([
            'password' => Hash::make($password),
        ]);

        // Invalide le token
        $resetToken->update(['used' => true]);

        // Révoque tous les tokens existants (sécurité)
        $user->tokens()->delete();
    }
}