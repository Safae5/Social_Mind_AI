<?php

namespace App\Notifications\Auth;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WelcomeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $userName,
        private readonly string $role
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $dashboardUrl = config('app.frontend_url')
            . ($this->role === 'business' ? '/business' : '/dashboard');

        return (new MailMessage)
            ->subject('Bienvenue sur Social Mind AI 🚀')
            ->greeting("Bienvenue {$this->userName} !")
            ->line('Votre compte a été activé avec succès.')
            ->line('Votre essai gratuit de 30 jours commence maintenant.')
            ->action('Accéder à mon tableau de bord', $dashboardUrl)
            ->line('Découvrez vos agents IA et automatisez votre marketing dès aujourd\'hui.')
            ->salutation('L\'équipe Social Mind AI');
    }
}