<?php

namespace App\Notifications;

use App\Models\WeeklyReport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class WeeklyReportNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly WeeklyReport $report,
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type'           => 'weekly_report',
            'report_id'      => $this->report->id,
            'titre'          => $this->report->ai_titre_semaine,
            'emoji'          => $this->report->ai_emoji_semaine,
            'score'          => $this->report->score,
            'recommandation' => $this->report->ai_recommandation,
            'week_start'     => $this->report->week_start?->format('d/m/Y'),
            'week_end'       => $this->report->week_end?->format('d/m/Y'),
            'message'        => "📊 Votre résumé de la semaine est prêt !",
        ];
    }
}