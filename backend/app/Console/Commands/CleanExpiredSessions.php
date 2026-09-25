<?php

namespace App\Console\Commands;

use App\Models\UserSession;
use Illuminate\Console\Command;

class CleanExpiredSessions extends Command
{
    protected $signature   = 'sessions:clean';
    protected $description = 'Supprime les sessions expirées de la base de données';

    public function handle(): void
    {
        $count = UserSession::where('expires_at', '<', now())->delete();
        $this->info("✅ {$count} sessions expirées supprimées.");
    }
}