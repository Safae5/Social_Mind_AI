<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;

class NegativeCommentAlert extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly int $count,
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type'    => 'negative_comment_alert',
            'count'   => $this->count,
            'message' => "⚠️ {$this->count} commentaire(s) négatif(s) en attente de réponse.",
        ];
    }
}