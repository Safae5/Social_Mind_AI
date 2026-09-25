<?php

namespace App\Listeners;

use App\Events\SocialAccountConnected;
use App\Jobs\AnalyzeOptimalSlotsJob;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendScheduledPostReminder implements ShouldQueue
{
    public string $queue = 'notifications';

    public function handle(SocialAccountConnected $event): void
    {
        // Notifie l'utilisateur que l'analyse est en cours
        $event->user->notify(
            new \App\Notifications\SocialAccountConnectedNotification($event->account)
        );
    }
}