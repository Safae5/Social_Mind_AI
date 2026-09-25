<?php

namespace App\Notifications;

use App\Models\SocialAccount;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SocialAccountConnectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly SocialAccount $account,
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('✅ Compte ' . ucfirst($this->account->platform) . ' connecté')
            ->greeting("Bonjour {$notifiable->first_name} !")
            ->line("Votre compte **{$this->account->platform_username}** sur **{$this->account->platform}** a été connecté avec succès.")
            ->line("L'IA analyse maintenant vos publications pour détecter vos meilleurs créneaux.")
            ->action('Voir le Planificateur', config('app.frontend_url') . '/dashboard/agents/planificateur')
            ->line('Social Mind AI — Votre assistant IA de réseaux sociaux.');
    }

    public function toArray($notifiable): array
    {
        return [
            'type'       => 'social_account_connected',
            'account_id' => $this->account->id,
            'platform'   => $this->account->platform,
            'username'   => $this->account->platform_username,
            'message'    => "✅ Compte {$this->account->platform} (@{$this->account->platform_username}) connecté. Analyse IA en cours...",
        ];
    }
}