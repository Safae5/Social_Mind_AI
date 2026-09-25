<?php

namespace App\Jobs;

use App\Models\CalendarSlot;
use App\Models\ContentCalendar;
use App\Models\SocialAccount;
use App\Models\User;
use App\Notifications\ContentCalendarNotification;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GenerateContentCalendarJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
    public int $tries   = 2;

    public function __construct(
        private readonly User $user,
    ) {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        // ── Semaine à venir (prochain lundi) ──────────────────
        $weekStart = Carbon::now()->next('Monday');
        $weekEnd   = $weekStart->copy()->addDays(6);
        $weekNum   = (int) $weekStart->weekOfYear;
        $year      = (int) $weekStart->year;

        Log::info("GenerateContentCalendarJob — user #{$this->user->id} semaine {$weekNum}/{$year}");

        // ── Évite les doublons ────────────────────────────────
        if (ContentCalendar::where('user_id', $this->user->id)
            ->where('week_number', $weekNum)
            ->where('year', $year)
            ->exists()) {
            Log::info("Calendrier déjà généré — skip");
            return;
        }

        // ── Comptes sociaux actifs ────────────────────────────
        $accounts = SocialAccount::where('user_id', $this->user->id)
            ->where('is_active', true)
            ->get();

        $platforms = $accounts->pluck('platform')->unique()->values()->toArray();

        if (empty($platforms)) {
            Log::warning("Aucun compte social actif pour user #{$this->user->id}");
            // Fallback sur les plateformes du profil
            $platforms = $this->user->connected_platforms ?? ['instagram'];
        }

        $niche      = $this->user->brand_niche ?? 'contenu général';
        $frequency  = $this->user->getPostFrequencyAsInt();
        $objectives = ['engagement', 'notoriété'];

        // ── Appel AI Engine ────────────────────────────────────
        try {
            $aiResponse = Http::timeout(300)->post(
                config('services.ai_engine.url', 'http://localhost:8001') . '/content-calendar/generate',
                [
                    'niche'       => $niche,
                    'platforms'   => $platforms,
                    'frequency'   => $frequency,
                    'language'    => 'Français',
                    'objectives'  => $objectives,
                    'brand_voice' => $this->user->brand_tone ?? '',
                    'week_start'  => $weekStart->format('Y-m-d'),
                ]
            );

            if ($aiResponse->failed()) {
                Log::error("ContentCalendar AI Engine erreur user #{$this->user->id}: " . $aiResponse->body());
                return;
            }

        } catch (\Exception $e) {
            Log::error("ContentCalendar connexion AI Engine échouée: " . $e->getMessage());
            return;
        }

        $data      = $aiResponse->json();
        $plan      = $data['plan']      ?? [];
        $coherence = $data['coherence'] ?? [];

        if (empty($plan)) {
            Log::error("ContentCalendar plan vide pour user #{$this->user->id}");
            return;
        }

        // ── Créer le calendrier ───────────────────────────────
        $calendar = ContentCalendar::create([
            'user_id'           => $this->user->id,
            'social_account_id' => $accounts->first()?->id ?? 0,
            'week_start'        => $weekStart->toDateString(),
            'week_end'          => $weekEnd->toDateString(),
            'week_number'       => $weekNum,
            'year'              => $year,
            'niche'             => $niche,
            'platforms'         => $platforms,
            'frequency'         => $frequency,
            'objectives'        => $objectives,
            'coherence_score'   => $coherence['score'] ?? null,
            'coherence_level'   => $coherence['level'] ?? null,
            'status'            => 'draft',
        ]);

        // ── Créer les 7 slots ─────────────────────────────────
        foreach ($plan as $i => $slot) {
            CalendarSlot::create([
                'content_calendar_id' => $calendar->id,
                'user_id'             => $this->user->id,
                'day_name'            => $slot['day']           ?? "Jour " . ($i + 1),
                'date'                => $slot['date']          ?? $weekStart->copy()->addDays($i)->format('Y-m-d'),
                'day_index'           => $i,
                'is_rest_day'         => $slot['is_rest_day']   ?? false,
                'platform'            => $slot['platform']      ?? null,
                'post_type'           => $slot['post_type']     ?? null,
                'subject'             => $slot['subject']       ?? null,
                'angle'               => $slot['angle']         ?? null,
                'caption_idea'        => $slot['caption_idea']  ?? null,
                'best_time'           => $slot['best_time']     ?? null,
                'hashtag_themes'      => $slot['hashtag_themes'] ?? [],
                'hashtags'            => $slot['hashtags']      ?? [],
                'why'                 => $slot['why']           ?? null,
                'status'              => 'suggested',
            ]);
        }

        // ── Notification in-app ───────────────────────────────
        $this->user->notify(new ContentCalendarNotification($calendar));

        Log::info("Calendrier généré user #{$this->user->id} semaine {$weekNum}/{$year} ✅");
    }

    public function failed(\Throwable $e): void
    {
        Log::error("GenerateContentCalendarJob failed user #{$this->user->id}: " . $e->getMessage());
    }
}