<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\Scheduler\AnalyzeRequest;
use App\Http\Requests\Scheduler\AddToQueueRequest;
use App\Http\Requests\Scheduler\SchedulePostRequest;
use App\Http\Resources\SocialAccountResource;
use App\Http\Resources\OptimalSlotResource;
use App\Http\Resources\ContentQueueResource;
use App\Http\Resources\ScheduledPostResource;
use App\Models\ContentQueue;
use App\Models\OptimalSlot;
use App\Models\ScheduledPost;
use App\Models\SocialAccount;
use App\Models\AgentActivityLog;
use App\Repositories\ContentQueueRepository;
use App\Repositories\SocialAccountRepository;
use App\Services\Scheduler\SchedulerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchedulerController extends Controller
{
    public function __construct(
        private readonly SchedulerService         $schedulerService,
        private readonly SocialAccountRepository  $socialAccountRepo,
        private readonly ContentQueueRepository   $queueRepo,
    ) {}

    // ── GET /api/scheduler/accounts ───────────────────────────
    public function accounts(Request $request): JsonResponse
    {
        $accounts = $this->socialAccountRepo->findActive($request->user()->id);

        return response()->json([
            'success' => true,
            'data'    => [
                'accounts' => SocialAccountResource::collection($accounts),
                'total'    => $accounts->count(),
                'max'      => 2,
            ],
        ]);
    }

    // ── POST /api/scheduler/analyze ───────────────────────────
    public function analyze(AnalyzeRequest $request): JsonResponse
    {
        $user    = $request->user();
        $account = SocialAccount::where('user_id', $user->id)
            ->where('id', $request->account_id)
            ->active()
            ->firstOrFail();

        $useQueue = $request->boolean('async', true);

        if ($useQueue) {
            // Mode asynchrone — dispatche le job
            $result = $this->schedulerService->triggerAnalysis($account, true);
        } else {
            // Mode synchrone — attend le résultat IA
            $result = $this->schedulerService->runAnalysisNow($account);
        }

        AgentActivityLog::create([
            'user_id'    => $user->id,
            'agent_slug' => 'scheduler',
            'agent_name' => 'Planificateur Intelligent',
            'action'     => 'slot_analysis',
            'description'=> "Analyse des créneaux optimaux pour le compte #{$account->id}",
            'status'     => $useQueue ? 'pending' : 'success',
            'started_at' => now(),
            'completed_at' => $useQueue ? null : now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $useQueue
                ? 'Analyse planifiée. Les créneaux optimaux seront disponibles dans quelques minutes.'
                : 'Analyse terminée !',
            'data'    => $result,
        ]);
    }

    // ── GET /api/scheduler/calendar ───────────────────────────
    public function calendar(Request $request): JsonResponse
    {
        $days     = (int) $request->get('days', 30);
        $calendar = $this->schedulerService->getCalendar($request->user(), $days);

        return response()->json([
            'success' => true,
            'data'    => $calendar,
        ]);
    }

    // ── GET /api/scheduler/slots ──────────────────────────────
    public function optimalSlots(Request $request): JsonResponse
    {
        $slots = OptimalSlot::where('user_id', $request->user()->id)
            ->valid()
            ->topSlots(14)
            ->with('socialAccount:id,platform,platform_username')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'slots'         => OptimalSlotResource::collection($slots),
                'last_analyzed' => $slots->first()?->analyzed_at?->toIso8601String(),
                'data_source'   => $slots->first()?->data_source ?? 'none',
            ],
        ]);
    }

    // ── GET /api/scheduler/queue ──────────────────────────────
    public function queue(Request $request): JsonResponse
    {
        $accountId = $request->integer('account_id', 0);
        $queue     = $this->queueRepo->getQueue($request->user()->id, $accountId ?: null);

        return response()->json([
            'success' => true,
            'data'    => [
                'queue' => ContentQueueResource::collection($queue),
                'total' => $queue->count(),
            ],
        ]);
    }

    // ── POST /api/scheduler/queue ─────────────────────────────
    public function addToQueue(AddToQueueRequest $request): JsonResponse
    {
        $user    = $request->user();
        $account = SocialAccount::where('user_id', $user->id)
            ->findOrFail($request->social_account_id);

        $item = $this->schedulerService->addToQueue(
            $user,
            $account,
            $request->validated(),
            $request->get('source', 'manual')
        );

        return response()->json([
            'success' => true,
            'message' => 'Contenu ajouté à la file d\'attente !',
            'data'    => ['item' => new ContentQueueResource($item->load('socialAccount'))],
        ], 201);
    }

    // ── DELETE /api/scheduler/queue/{id} ─────────────────────
    public function removeFromQueue(Request $request, int $id): JsonResponse
    {
        $removed = $this->queueRepo->remove($request->user()->id, $id);

        if (!$removed) {
            return response()->json(['success' => false, 'message' => 'Élément introuvable.'], 404);
        }

        return response()->json(['success' => true, 'message' => 'Supprimé de la file.']);
    }

    // ── GET /api/scheduler/upcoming ───────────────────────────
    public function upcoming(Request $request): JsonResponse
    {
        $posts = ScheduledPost::where('user_id', $request->user()->id)
            ->upcoming()
            ->with('socialAccount:id,platform,platform_username,platform_avatar_url')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => ['posts' => ScheduledPostResource::collection($posts)],
        ]);
    }

    // ── DELETE /api/scheduler/accounts/{platform}/disconnect ──
    public function disconnectAccount(Request $request, string $platform): JsonResponse
    {
        $account = SocialAccount::where('user_id', $request->user()->id)
            ->where('platform', $platform)
            ->firstOrFail();

        $account->delete();

        return response()->json([
            'success' => true,
            'message' => "Compte {$platform} déconnecté avec succès.",
        ]);
    }

    // ── POST /api/scheduler/posts/{id}/cancel ─────────────────
    public function cancelScheduledPost(Request $request, int $id): JsonResponse
    {
        $post = ScheduledPost::where('user_id', $request->user()->id)
            ->where('status', 'pending')
            ->findOrFail($id);

        $post->update(['status' => 'cancelled']);

        return response()->json([
            'success' => true,
            'message' => 'Publication annulée.',
        ]);
    }
}