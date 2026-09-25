<?php

namespace App\Notifications;

use App\Models\ContentCalendar;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ContentCalendarNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly ContentCalendar $calendar,
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type'          => 'content_calendar',
            'calendar_id'   => $this->calendar->id,
            'week_start'    => $this->calendar->week_start?->format('d/m/Y'),
            'week_end'      => $this->calendar->week_end?->format('d/m/Y'),
            'niche'         => $this->calendar->niche,
            'frequency'     => $this->calendar->frequency,
            'coherence'     => $this->calendar->coherence_level,
            'message'       => "📅 Votre plan de contenu pour la semaine est prêt !",
        ];
    }
}