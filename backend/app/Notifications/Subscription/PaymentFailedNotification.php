<?php

namespace App\Notifications\Subscription;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentFailedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function via(object $notifiable): array { return ['mail']; }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('⚠️ Échec du paiement — Social Mind AI')
            ->greeting('Problème de paiement')
            ->line('Le renouvellement de votre abonnement a échoué.')
            ->line('Veuillez mettre à jour vos informations de paiement.')
            ->action('Mettre à jour le paiement', config('app.frontend_url') . '/upgrade')
            ->salutation("L'équipe Social Mind AI");
    }
}