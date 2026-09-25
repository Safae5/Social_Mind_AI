<?php

namespace App\Notifications\Subscription;

use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionActivatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $planName,
        private readonly ?Carbon $endsAt
    ) {}

    public function via(object $notifiable): array { return ['mail']; }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject("Abonnement activé — {$this->planName} 🎉")
            ->greeting("Bienvenue sur {$this->planName} !")
            ->line("Votre abonnement **{$this->planName}** est maintenant actif.")
            ->action('Accéder à mon tableau de bord', config('app.frontend_url') . '/dashboard');

        if ($this->endsAt) {
            $message->line("Prochain renouvellement : " . $this->endsAt->format('d/m/Y'));
        }

        return $message->salutation("L'équipe Social Mind AI");
    }
}