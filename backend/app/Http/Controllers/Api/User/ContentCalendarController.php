<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Jobs\GenerateContentCalendarJob;
use App\Models\AgentActivityLog;
use App\Models\CalendarSlot;
use App\Models\ContentCalendar;
use App\Models\User;
use App\Services\Scheduler\SchedulerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ContentCalendarController extends Controller
{
    private string $aiEngineUrl;

    public function __construct(
        private readonly SchedulerService $schedulerService,
    ) {
        $this->aiEngineUrl = config('services.ai_engine.url', 'http://localhost:8001');
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/calendar — Historique des 8 derniers calendriers
    // ══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $calendars = ContentCalendar::where('user_id', $user->id)
            ->with('slots')
            ->orderByDesc('week_start')
            ->take(8)
            ->get()
            ->map(fn($c) => [
                'id'              => $c->id,
                'week_start'      => $c->week_start?->format('d/m/Y'),
                'week_end'        => $c->week_end?->format('d/m/Y'),
                'week_number'     => $c->week_number,
                'niche'           => $c->niche,
                'platforms'       => $c->platforms,
                'frequency'       => $c->frequency,
                'coherence_score' => $c->coherence_score,
                'coherence_level' => $c->coherence_level,
                'status'          => $c->status,
                'is_read'         => $c->is_read,
                'slots'           => $c->slots->map(fn($s) => $this->formatSlot($s)),
            ]);

        return response()->json([
            'success' => true,
            'data'    => ['calendars' => $calendars],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // GET /api/calendar/current — Calendrier semaine en cours
    // ══════════════════════════════════════════════════════════

    public function current(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $calendar = ContentCalendar::where('user_id', $user->id)
            ->with('slots')
            ->where('week_start', '>=', now()->startOfWeek())
            ->orderBy('week_start')
            ->first();

        if (!$calendar) {
            // Cherche aussi la semaine précédente (la plus récente)
            $calendar = ContentCalendar::where('user_id', $user->id)
                ->with('slots')
                ->orderByDesc('week_start')
                ->first();
        }

        if (!$calendar) {
            return response()->json([
                'success' => true,
                'data'    => ['calendar' => null],
                'message' => 'Aucun calendrier disponible. Générez-en un maintenant.',
            ]);
        }

        if (!$calendar->is_read) {
            $calendar->update(['is_read' => true]);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'calendar' => array_merge($calendar->toArray(), [
                    'week_start' => $calendar->week_start?->format('d/m/Y'),
                    'week_end'   => $calendar->week_end?->format('d/m/Y'),
                    'slots'      => $calendar->slots->map(fn($s) => $this->formatSlot($s)),
                ]),
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/calendar/generate — Générer maintenant
    // ══════════════════════════════════════════════════════════

    public function generateNow(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        GenerateContentCalendarJob::dispatch($user)->onQueue('default');

        AgentActivityLog::create([
            'user_id'    => $user->id,
            'agent_slug' => 'content-calendar',
            'agent_name' => 'Calendrier de Contenu',
            'action'     => 'calendar_generation',
            'description'=> 'Génération manuelle du calendrier de contenu demandée',
            'status'     => 'pending',
            'started_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => '✅ Génération lancée ! Votre calendrier sera disponible dans quelques minutes.',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/calendar/slots/{id}/approve
    // ══════════════════════════════════════════════════════════

    public function approveSlot(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $slot = CalendarSlot::where('user_id', $user->id)->findOrFail($id);
        $slot->update(['status' => 'approved']);

        return response()->json([
            'success' => true,
            'message' => '✅ Slot approuvé.',
            'data'    => ['slot' => $this->formatSlot($slot->fresh())],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/calendar/slots/{id}/modify
    // ══════════════════════════════════════════════════════════

    public function modifySlot(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'user_platform'  => 'nullable|string|in:instagram,tiktok,facebook,linkedin,twitter',
            'user_post_type' => 'nullable|string|in:reel,carousel,static,story,video,article',
            'user_subject'   => 'nullable|string|max:300',
            'user_caption'   => 'nullable|string|max:2200',
            'user_time'      => 'nullable|string|max:10',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();
        $slot = CalendarSlot::where('user_id', $user->id)->findOrFail($id);

        $slot->update(array_merge(
            $request->only(['user_platform', 'user_post_type', 'user_subject', 'user_caption', 'user_time']),
            ['status' => 'modified']
        ));

        return response()->json([
            'success' => true,
            'message' => '✅ Slot modifié.',
            'data'    => ['slot' => $this->formatSlot($slot->fresh())],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/calendar/slots/{id}/skip
    // ══════════════════════════════════════════════════════════

    public function skipSlot(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        CalendarSlot::where('user_id', $user->id)->findOrFail($id)->update(['status' => 'skipped']);

        return response()->json([
            'success' => true,
            'message' => 'Slot ignoré.',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/calendar/slots/{id}/regenerate
    // ══════════════════════════════════════════════════════════

    public function regenerateSlot(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $slot     = CalendarSlot::where('user_id', $user->id)->findOrFail($id);
        $calendar = $slot->calendar;

        $existingPlan = $calendar->slots->map(fn($s) => [
            'day'        => $s->day_name,
            'date'       => $s->date?->format('Y-m-d'),
            'is_rest_day'=> $s->is_rest_day,
            'subject'    => $s->subject,
            'platform'   => $s->platform,
        ])->toArray();

        try {
            $aiResponse = Http::timeout(120)->post(
                "{$this->aiEngineUrl}/content-calendar/regenerate-day",
                [
                    'niche'         => $calendar->niche,
                    'platforms'     => $calendar->platforms,
                    'day_name'      => $slot->day_name,
                    'date'          => $slot->date?->format('Y-m-d'),
                    'existing_plan' => $existingPlan,
                    'language'      => 'Français',
                ]
            );

            if ($aiResponse->failed()) {
                return response()->json(['success' => false, 'message' => 'Erreur AI Engine'], 500);
            }

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Impossible de joindre l\'AI Engine.'], 503);
        }

        $newSlot = $aiResponse->json()['slot'] ?? null;
        if (!$newSlot) {
            return response()->json(['success' => false, 'message' => 'Réponse IA invalide.'], 500);
        }

        $slot->update([
            'platform'      => $newSlot['platform']       ?? $slot->platform,
            'post_type'     => $newSlot['post_type']      ?? $slot->post_type,
            'subject'       => $newSlot['subject']        ?? $slot->subject,
            'angle'         => $newSlot['angle']          ?? $slot->angle,
            'caption_idea'  => $newSlot['caption_idea']   ?? $slot->caption_idea,
            'best_time'     => $newSlot['best_time']      ?? $slot->best_time,
            'hashtag_themes'=> $newSlot['hashtag_themes'] ?? [],
            'hashtags'      => $newSlot['hashtags']       ?? [],
            'why'           => $newSlot['why']            ?? $slot->why,
            'status'        => 'suggested',
            // Reset des modifications utilisateur
            'user_subject'  => null,
            'user_caption'  => null,
            'user_platform' => null,
            'user_post_type'=> null,
        ]);

        return response()->json([
            'success' => true,
            'message' => '🔄 Jour régénéré avec succès !',
            'data'    => ['slot' => $this->formatSlot($slot->fresh())],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/calendar/slots/{id}/queue — Envoyer au Planificateur
    // ══════════════════════════════════════════════════════════

    public function queueSlot(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $slot = CalendarSlot::where('user_id', $user->id)->findOrFail($id);

        try {
            $item = $this->sendSlotToScheduler($user, $slot);
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Log::error("QueueSlot: échec de mise en file pour slot #{$slot->id}: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => "Impossible d'ajouter ce contenu à la file d'attente du Planificateur.",
            ], 500);
        }

        return response()->json([
            'success'  => true,
            'message'  => "📅 Ajouté à la file d'attente du Planificateur !",
            'data'     => ['queue_id' => $item->id],
        ]);
    }

    // ── Met un slot en file d'attente auprès du Planificateur ─────
    // Appel INTERNE direct à SchedulerService — auparavant Laravel
    // s'appelait lui-même en HTTP sur /api/scheduler/queue (fragile :
    // dépend de app.url, du token bearer de la requête courante, et
    // échouait silencieusement en marquant quand même le slot "queued"
    // avec content_queue_id=null). Lève désormais une vraie exception
    // en cas d'échec au lieu de l'avaler.
    private function sendSlotToScheduler(User $user, CalendarSlot $slot): \App\Models\ContentQueue
    {
        $content = $slot->getFinalContent();

        $account = $user->socialMediaAccounts()
            ->where('platform', $content['platform'])
            ->active()
            ->first();

        if (!$account) {
            throw new \RuntimeException("Aucun compte {$content['platform']} connecté.");
        }

        $item = $this->schedulerService->addToQueue(
            $user,
            $account,
            [
                'caption'          => $content['caption'] ?? $content['subject'],
                'hashtags'         => $content['hashtags'],
                'media_type'       => $this->mapPostTypeToMediaType($content['post_type']),
                'calendar_slot_id' => $slot->id,
            ],
            'calendar'
        );

        $slot->update([
            'status'           => 'queued',
            'content_queue_id' => $item->id,
        ]);

        return $item;
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/calendar/{id}/approve-all
    // ══════════════════════════════════════════════════════════

    public function approveAll(Request $request, int $calendarId): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $calendar = ContentCalendar::where('user_id', $user->id)->findOrFail($calendarId);

        $slots  = $calendar->slots()
            ->where('is_rest_day', false)
            ->whereIn('status', ['suggested', 'modified'])
            ->get();

        $queued = 0;
        $failed = 0;
        foreach ($slots as $slot) {
            $slot->update(['status' => 'approved']);
            // Tente de mettre en file d'attente chaque slot — un échec ne doit
            // pas être compté comme un succès (voir sendSlotToScheduler()).
            try {
                $this->sendSlotToScheduler($user, $slot);
                $queued++;
            } catch (\Throwable $e) {
                Log::warning("ApproveAll: échec de mise en file pour slot #{$slot->id}: " . $e->getMessage());
                $failed++;
            }
        }

        $message = $failed > 0
            ? "⚠️ {$queued} publication(s) ajoutée(s), {$failed} échec(s) — voir les slots concernés."
            : "✅ {$queued} publication(s) ajoutée(s) au Planificateur !";

        return response()->json([
            'success' => $failed === 0,
            'message' => $message,
            'data'    => ['queued' => $queued, 'failed' => $failed],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // HELPER — Format slot pour React
    // ══════════════════════════════════════════════════════════

    private function formatSlot(CalendarSlot $slot): array
    {
        $final = $slot->getFinalContent();
        return [
            'id'              => $slot->id,
            'day_name'        => $slot->day_name,
            'date'            => $slot->date?->format('Y-m-d'),
            'date_fr'         => $slot->date?->format('d/m'),
            'day_index'       => $slot->day_index,
            'is_rest_day'     => $slot->is_rest_day,
            'platform'        => $final['platform'],
            'post_type'       => $final['post_type'],
            'subject'         => $final['subject'],
            'angle'           => $slot->angle,
            'caption_idea'    => $final['caption'],
            'best_time'       => $final['time'],
            'hashtags'        => $final['hashtags'],
            'why'             => $slot->why,
            'coherence_score' => $slot->coherence_score,
            'status'          => $slot->status,
            'is_modified'     => !is_null($slot->user_subject) || !is_null($slot->user_platform),
        ];
    }

    private function mapPostTypeToMediaType(string $postType): string
    {
        return match($postType) {
            'reel'    => 'reel',
            'carousel'=> 'carousel',
            'video'   => 'video',
            'story'   => 'story',
            default   => 'image',
        };
    }
}