<?php

namespace App\Notifications\Subscription;

use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionCanceledNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly ?Carbon $accessUntil
    ) {}

    public function via(object $notifiable): array { return ['mail']; }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject('Abonnement annulé — Social Mind AI')
            ->greeting('Abonnement annulé')
            ->line('Votre abonnement a été annulé.');

        if ($this->accessUntil) {
            $message->line(
                "Vous conservez l'accès jusqu'au " .
                $this->accessUntil->format('d/m/Y') . '.'
            );
        }

        return $message
            ->action('Reprendre mon abonnement', config('app.frontend_url') . '/upgrade')
            ->salutation("L'équipe Social Mind AI");
    }
}