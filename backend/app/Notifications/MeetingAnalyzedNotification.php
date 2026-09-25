<?php

namespace App\Notifications;

use App\Models\ClientAnalysis;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class MeetingAnalyzedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly ClientAnalysis $analysis,
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type'        => 'meeting_analyzed',
            'analysis_id' => $this->analysis->id,
            'client_nom'  => $this->analysis->client_nom,
            'niche'       => $this->analysis->profil_client['niche'] ?? null,
            'has_pdf'     => $this->analysis->hasPdf(),
            'message'     => "✅ Analyse de la réunion de {$this->analysis->client_nom} terminée ! Stratégie 30 jours prête.",
        ];
    }
}