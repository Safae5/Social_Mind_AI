<?php

namespace App\Notifications;

use App\Models\ScheduledPost;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PostPublishedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly ScheduledPost $post,
        public readonly array         $publishResult,
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toArray($notifiable): array
    {
        return [
            'type'             => 'post_published',
            'post_id'          => $this->post->id,
            'platform'         => $this->post->socialAccount->platform ?? '',
            'platform_post_url'=> $this->publishResult['post_url'] ?? null,
            'published_at'     => now()->toIso8601String(),
            'message'          => "✅ Votre publication a été publiée avec succès sur {$this->post->socialAccount->platform} !",
        ];
    }
}