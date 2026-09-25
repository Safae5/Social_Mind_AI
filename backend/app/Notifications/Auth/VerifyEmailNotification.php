<?php

namespace App\Notifications\Auth;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyEmailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $token,
        private readonly string $userName
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $verificationUrl = config('app.frontend_url')
            . '/verify-email?token=' . $this->token
            . '&email=' . urlencode($notifiable->email);

        return (new MailMessage)
            ->subject('Vérifiez votre adresse e-mail — Social Mind AI')
            ->greeting("Bonjour {$this->userName} 👋")
            ->line('Merci de vous être inscrit sur Social Mind AI.')
            ->line('Cliquez sur le bouton ci-dessous pour vérifier votre adresse e-mail.')
            ->action('Vérifier mon e-mail', $verificationUrl)
            ->line('Ce lien expire dans **24 heures**.')
            ->line('Si vous n\'avez pas créé de compte, ignorez cet e-mail.')
            ->salutation('L\'équipe Social Mind AI');
    }
}