<?php

namespace App\Notifications;

use App\Models\ScheduledPost;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ScheduledPostReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly ScheduledPost $post,
    ) {}

    public function via($notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('📅 Rappel : Publication planifiée dans 1 heure')
            ->greeting("Bonjour {$notifiable->first_name} !")
            ->line("Votre publication est planifiée dans **1 heure** sur **{$this->post->socialAccount->platform}**.")
            ->line("Légende : " . substr($this->post->caption, 0, 100) . "...")
            ->action('Voir le Planning', config('app.frontend_url') . '/dashboard/calendar')
            ->line('Social Mind AI — Votre assistant IA de réseaux sociaux.');
    }

    public function toArray($notifiable): array
    {
        return [
            'type'         => 'scheduled_post_reminder',
            'post_id'      => $this->post->id,
            'platform'     => $this->post->socialAccount->platform ?? '',
            'scheduled_at' => $this->post->scheduled_at->toIso8601String(),
            'caption'      => substr($this->post->caption, 0, 100),
            'message'      => "Publication planifiée dans 1 heure sur {$this->post->socialAccount->platform}.",
        ];
    }
}