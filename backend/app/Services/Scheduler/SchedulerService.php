<?php

namespace App\Services\Scheduler;

use App\Jobs\AnalyzeOptimalSlotsJob;
use App\Jobs\ProcessScheduledPostJob;
use App\Models\ContentQueue;
use App\Models\OptimalSlot;
use App\Models\ScheduledPost;
use App\Models\SocialAccount;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SchedulerService
{
    private string $aiEngineUrl;

    public function __construct()
    {
        $this->aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');
    }

    // ──────────────────────────────────────────────────────────
    // ANALYSE IA (appelle Python FastAPI → Prophet + KMeans)
    // ──────────────────────────────────────────────────────────

    /**
     * Lance l'analyse complète pour un compte social.
     * Dispatch vers AnalyzeOptimalSlotsJob (queue).
     */
    public function triggerAnalysis(SocialAccount $account, bool $useQueue = true): array
    {
        if ($useQueue) {
            AnalyzeOptimalSlotsJob::dispatch($account)->onQueue('ai');
            return ['status' => 'queued', 'message' => 'Analyse planifiée en arrière-plan.'];
        }

        return $this->runAnalysisNow($account);
    }

    /**
     * Exécute l'analyse immédiatement (sans queue).
     */
    public function runAnalysisNow(SocialAccount $account): array
    {
        // Page token en priorité pour Instagram/Facebook : Meta exige
        // désormais un token de Page (pas le token utilisateur) pour lire
        // les posts d'une Page ou d'un compte IG Business qui y est lié —
        // confirmé en direct : Graph API renvoie "Un token d'accès de Page
        // est requis pour cet appel dans la nouvelle version des Pages."
        // avec le token utilisateur, alors que le même appel réussit avec
        // le token de Page. TikTok (pas de notion de Page) retombe sur le
        // token utilisateur normalement.
        $token = $account->getDecryptedPageAccessToken() ?? $account->getDecryptedAccessToken();

        $payload = [
            'user_id'           => $account->user_id,
            'social_account_id' => $account->id,
            'platform'          => $account->platform,
            'access_token'      => $token ?? '',
            'platform_user_id'  => $account->platform_user_id ?? '',
            'page_id'           => $account->page_id,
        ];

        try {
            $response = Http::timeout(180)
                ->post("{$this->aiEngineUrl}/scheduler/analyze", $payload);

            if (!$response->successful()) {
                throw new \Exception("AI Engine error: " . $response->body());
            }

            $data = $response->json();

            // Sauvegarde les créneaux optimaux en base
            $this->persistOptimalSlots($account, $data);

            return $data;

        } catch (\Exception $e) {
            Log::error("SchedulerService::runAnalysisNow failed", [
                'account_id' => $account->id,
                'error'      => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Sauvegarde les créneaux optimaux renvoyés par Python.
     */
    public function persistOptimalSlots(SocialAccount $account, array $aiData): void
    {
        DB::transaction(function () use ($account, $aiData) {
            // Supprime les anciens créneaux expirés
            OptimalSlot::where('social_account_id', $account->id)
                ->where(function ($q) {
                    $q->where('expires_at', '<', now())
                      ->orWhereNull('expires_at');
                })
                ->delete();

            foreach ($aiData['optimal_slots'] ?? [] as $slot) {
                OptimalSlot::updateOrCreate(
                    [
                        'user_id'           => $account->user_id,
                        'social_account_id' => $account->id,
                        'day_of_week'       => $slot['day_index'],
                        'hour'              => $slot['hour'],
                    ],
                    [
                        'day_name'        => $slot['day_fr'],
                        'time'            => $slot['time'],
                        'platform'        => $account->platform,
                        'engagement_score'=> $slot['predicted_score'],
                        'reach_score'     => $slot['predicted_score'],
                        'composite_score' => $slot['predicted_score'],
                        'rank'            => $slot['rank'],
                        'cluster_id'      => $slot['cluster'] ?? 0,
                        'posts_analyzed'  => $aiData['data_points'] ?? 0,
                        'heatmap_data'    => $aiData['analytics']['heatmap_data'] ?? [],
                        'data_source'     => $aiData['data_source'] ?? 'sample',
                        'analyzed_at'     => now(),
                        'expires_at'      => now()->addDays(7),
                    ]
                );
            }
        });
    }

    // ──────────────────────────────────────────────────────────
    // FILE D'ATTENTE (Queue Management)
    // ──────────────────────────────────────────────────────────

    /**
     * Ajoute un contenu à la file d'attente.
     */
    public function addToQueue(
        User          $user,
        SocialAccount $account,
        array         $content,
        string        $source = 'manual'
    ): ContentQueue {
        $lastPosition = ContentQueue::where('user_id', $user->id)
            ->where('social_account_id', $account->id)
            ->whereIn('status', ['queued', 'scheduled'])
            ->max('queue_position') ?? 0;

        $item = ContentQueue::create([
            'user_id'          => $user->id,
            'social_account_id'=> $account->id,
            'caption'          => $content['caption'],
            'hashtags'         => $content['hashtags'] ?? [],
            'media_url'        => $content['media_url'] ?? null,
            'media_path'       => $content['media_path'] ?? null,
            'media_type'       => $content['media_type'] ?? 'image',
            'source'           => $source,
            'generated_content_id' => $content['generated_content_id'] ?? null,
            'calendar_slot_id'     => $content['calendar_slot_id'] ?? null,
            'status'           => 'queued',
            'queue_position'   => $lastPosition + 1,
        ]);

        // Auto-assignation au prochain créneau optimal
        $this->autoAssignNextSlot($account, $item);

        return $item;
    }

    /**
     * Auto-assigne un contenu au prochain créneau optimal disponible.
     */
    public function autoAssignNextSlot(SocialAccount $account, ContentQueue $queueItem): void
    {
        $bestSlot = OptimalSlot::where('social_account_id', $account->id)
            ->valid()
            ->topSlots(1)
            ->first();

        if (!$bestSlot) return;

        $scheduledAt = $bestSlot->getNextOccurrence();
        if (!$scheduledAt) return;

        // Vérifie qu'aucun autre post n'est planifié dans les 30 minutes
        $conflict = ScheduledPost::where('social_media_account_id', $account->id)
            ->where('status', 'pending')
            ->whereBetween('scheduled_at', [
                $scheduledAt->copy()->subMinutes(30),
                $scheduledAt->copy()->addMinutes(30),
            ])->exists();

        if ($conflict) return;

        DB::transaction(function () use ($account, $queueItem, $bestSlot, $scheduledAt) {
            $post = ScheduledPost::create([
                'user_id'           => $account->user_id,
                'social_media_account_id' => $account->id,
                'content_queue_id'  => $queueItem->id,
                'optimal_slot_id'   => $bestSlot->id,
                'caption'           => $queueItem->caption,
                'hashtags'          => $queueItem->hashtags,
                'media_url'         => $queueItem->media_url,
                'media_type'        => $queueItem->media_type,
                'scheduled_at'      => $scheduledAt,
                'ai_optimized_time' => true,
                'slot_score'        => $bestSlot->composite_score,
                'status'            => 'pending',
                'created_by_agent'  => 'scheduler_ai',
            ]);

            $queueItem->update(['status' => 'scheduled']);
        });
    }

    // ──────────────────────────────────────────────────────────
    // CALENDRIER PLANNING
    // ──────────────────────────────────────────────────────────

    /**
     * Retourne le calendrier des publications des 30 prochains jours.
     */
    public function getCalendar(User $user, int $days = 30): array
    {
        $upcoming = ScheduledPost::where('user_id', $user->id)
            ->where('scheduled_at', '>=', now())
            ->where('scheduled_at', '<=', now()->addDays($days))
            ->whereIn('status', ['pending', 'processing'])
            ->with('socialAccount:id,platform,platform_username,platform_avatar_url')
            ->orderBy('scheduled_at')
            ->get();

        $slots = OptimalSlot::where('user_id', $user->id)
            ->valid()
            ->with('socialAccount:id,platform')
            ->topSlots(14)
            ->get();

        // Construit la heatmap pour Chart.js
        $heatmap = [];
        foreach ($slots as $slot) {
            $heatmap[] = [
                'day'       => $slot->day_of_week,
                'hour'      => $slot->hour,
                'score'     => $slot->composite_score,
                'platform'  => $slot->platform,
            ];
        }

        return [
            'upcoming_posts' => $upcoming->map(fn ($p) => [
                'id'           => $p->id,
                'caption'      => substr($p->caption, 0, 120) . (strlen($p->caption) > 120 ? '...' : ''),
                'platform'     => $p->socialAccount->platform ?? 'unknown',
                'username'     => $p->socialAccount->platform_username ?? '',
                'avatar_url'   => $p->socialAccount->platform_avatar_url ?? '',
                'scheduled_at' => $p->scheduled_at->toIso8601String(),
                'media_type'   => $p->media_type,
                'status'       => $p->status,
                'ai_optimized' => $p->ai_optimized_time,
            ]),
            'optimal_slots' => $slots->map(fn ($s) => [
                'id'          => $s->id,
                'day'         => $s->day_of_week,
                'day_name'    => $s->day_name,
                'hour'        => $s->hour,
                'time'        => $s->time,
                'score'       => $s->composite_score,
                'rank'        => $s->rank,
                'platform'    => $s->platform,
                'next_occur'  => $s->getNextOccurrence()?->toIso8601String(),
            ]),
            'heatmap' => $heatmap,
        ];
    }
}