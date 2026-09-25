<?php

namespace App\Jobs;

use App\Mail\WeeklyReportMail;
use App\Models\SocialAccount;
use App\Models\WeeklyReport;
use App\Notifications\WeeklyReportNotification;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class GenerateWeeklyReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;  // 5 minutes max (Mistral peut être lent)
    public int $tries   = 2;

    public function __construct(
        private readonly SocialAccount $account,
    ) {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        $user      = $this->account->user;
        $weekStart = Carbon::now()->startOfWeek()->subWeek();
        $weekEnd   = Carbon::now()->startOfWeek()->subDay();
        $weekNum   = (int) $weekStart->weekOfYear;
        $year      = (int) $weekStart->year;

        Log::info("GenerateWeeklyReportJob — user #{$user->id} semaine {$weekNum}/{$year}");

        // ── Évite les doublons ────────────────────────────────
        if (WeeklyReport::where('user_id', $user->id)
            ->where('social_account_id', $this->account->id)
            ->where('week_number', $weekNum)
            ->where('year', $year)
            ->exists()) {
            Log::info("Rapport déjà généré — skip");
            return;
        }

        // ── Métriques semaine précédente pour variations ───────
        $previousReport  = WeeklyReport::where('user_id', $user->id)
            ->where('social_account_id', $this->account->id)
            ->orderByDesc('week_start')
            ->first();

        $previousMetrics = $previousReport ? [
            'total_reach'     => $previousReport->total_reach,
            'total_engagement'=> $previousReport->total_engagement,
            'followers_now'   => $previousReport->followers_now,
        ] : null;

        // ── Appel AI Engine ────────────────────────────────────
        try {
            $aiResponse = Http::timeout(300)->post(
                config('services.ai_engine.url', 'http://localhost:8001') . '/weekly-report/generate',
                [
                    'user_name'        => $user->first_name ?? $user->name ?? 'Utilisateur',
                    // "instagram_direct" signale à l'AI Engine d'utiliser
                    // graph.instagram.com — un jeton Instagram Login n'est
                    // valide nulle part ailleurs (voir SocialAccount::isInstagramDirectLogin).
                    'platform'         => $this->account->isInstagramDirectLogin()
                        ? 'instagram_direct' : $this->account->platform,
                    'brand_niche'      => $user->brand_niche ?? '',
                    'ig_user_id'       => $this->account->platform_user_id,
                    // Page Access Token requis pour les edges Page (/posts...)
                    // sous la "New Pages Experience" Meta — access_token seul
                    // (token utilisateur) échoue avec "a Page access token is
                    // required". Même pattern de fallback que SchedulerService,
                    // FetchInboxMessagesJob, ReplyController, etc. Un compte
                    // Instagram Login n'a jamais de Page (getDecryptedPageAccessToken
                    // reste null), donc ce fallback tombe naturellement sur
                    // le bon jeton pour ce cas aussi.
                    'access_token'     => $this->account->getDecryptedPageAccessToken()
                        ?? $this->account->getDecryptedAccessToken(),
                    'previous_metrics' => $previousMetrics,
                    'use_sample_data'  => false,
                ]
            );

            if ($aiResponse->failed()) {
                Log::error("WeeklyReport AI Engine erreur #{$user->id}: " . $aiResponse->body());
                // Retry avec données simulées
                $aiResponse = Http::timeout(300)->post(
                    config('services.ai_engine.url') . '/weekly-report/generate',
                    [
                        'user_name'       => $user->first_name ?? 'Utilisateur',
                        'platform'        => $this->account->platform,
                        'brand_niche'     => $user->brand_niche ?? '',
                        'use_sample_data' => true,
                    ]
                );

                if ($aiResponse->failed()) {
                    Log::error("WeeklyReport AI Engine fallback aussi échoué");
                    return;
                }
            }

        } catch (\Exception $e) {
            Log::error("WeeklyReport connexion AI Engine échouée: " . $e->getMessage());
            return;
        }

        $data    = $aiResponse->json();
        $report  = $data['report']      ?? [];
        $metrics = $data['metrics']     ?? [];
        $raw     = $data['raw_metrics'] ?? [];
        $trend   = $data['trend_data']  ?? [];
        $best    = $raw['best_post']    ?? null;

        // ── Sauvegarde en base ────────────────────────────────
        $weeklyReport = WeeklyReport::create([
            'user_id'            => $user->id,
            'social_account_id'  => $this->account->id,
            'week_start'         => $weekStart->toDateString(),
            'week_end'           => $weekEnd->toDateString(),
            'week_number'        => $weekNum,
            'year'               => $year,
            'total_reach'        => $raw['total_reach']      ?? 0,
            'total_engagement'   => $raw['total_engagement'] ?? 0,
            'total_likes'        => $raw['total_likes']      ?? 0,
            'total_comments'     => $raw['total_comments']   ?? 0,
            'total_shares'       => $raw['total_shares']     ?? 0,
            'total_saves'        => $raw['total_saves']      ?? 0,
            'total_posts'        => $raw['total_posts']      ?? 0,
            'followers_gained'   => $raw['followers_gained'] ?? 0,
            'followers_lost'     => $raw['followers_lost']   ?? 0,
            'followers_now'      => $raw['followers_now']    ?? 0,
            'best_post_id'       => $best['id']      ?? null,
            'best_post_caption'  => $best['caption'] ?? null,
            'best_post_reach'    => $best['reach']   ?? 0,
            'best_post_likes'    => $best['likes']   ?? 0,
            'ai_bilan'           => $report['bilan']           ?? '',
            'ai_top_publication' => $report['top_publication'] ?? '',
            'ai_audience'        => $report['audience']        ?? '',
            'ai_recommandation'  => $report['recommandation']  ?? '',
            'ai_emoji_semaine'   => $report['emoji_semaine']   ?? '✅',
            'ai_titre_semaine'   => $report['titre_semaine']   ?? 'Votre résumé de la semaine',
            'score'              => $metrics['score']          ?? 3,
            'trend_data'         => $trend,
        ]);

        // ── Envoi email ───────────────────────────────────────
        try {
            Mail::to($user->email)->send(new WeeklyReportMail($weeklyReport, $user));
            $weeklyReport->update(['email_sent' => true, 'email_sent_at' => now()]);
            Log::info("Email rapport envoyé à {$user->email}");
        } catch (\Exception $e) {
            Log::error("Erreur email rapport #{$weeklyReport->id}: " . $e->getMessage());
        }

        // ── Notification in-app ───────────────────────────────
        $user->notify(new WeeklyReportNotification($weeklyReport));

        Log::info("Rapport généré user #{$user->id} semaine {$weekNum}/{$year} ✅");
    }

    public function failed(\Throwable $e): void
    {
        Log::error("GenerateWeeklyReportJob failed compte #{$this->account->id}: " . $e->getMessage());
    }
}