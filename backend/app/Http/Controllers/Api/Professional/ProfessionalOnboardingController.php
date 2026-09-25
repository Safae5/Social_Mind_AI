<?php

namespace App\Http\Controllers\Api\Professional;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientWorkspace;
use App\Models\ProfessionalProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfessionalOnboardingController extends Controller
{
    // ══════════════════════════════════════════════════════════
    // GET /api/professional/onboarding — Statut onboarding
    // ══════════════════════════════════════════════════════════

    public function getStatus(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $profile = ProfessionalProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['onboarding_step' => 1]
        );

        return response()->json([
            'success' => true,
            'data'    => [
                'profile'             => $profile,
                'onboarding_completed'=> $profile->onboarding_completed,
                'current_step'        => $profile->onboarding_step,
                'completeness'        => $profile->calculateCompleteness(),
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/onboarding/step/{step}
    // ══════════════════════════════════════════════════════════

    public function saveStep(Request $request, int $step): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $profile = ProfessionalProfile::firstOrCreate(['user_id' => $user->id]);

        $data = match($step) {
            1 => $this->validateStep1($request),
            2 => $this->validateStep2($request),
            3 => $this->validateStep3($request),
            4 => $this->validateStep4($request),
            5 => $this->validateStep5($request),
            6 => $this->validateStep6($request),
            7 => $this->validateStep7($request),
            default => [],
        };

        $data['onboarding_step'] = max($profile->onboarding_step, $step + 1);

        if ($step === 7) {
            $data['onboarding_completed']    = true;
            $data['onboarding_completed_at'] = now();
        }

        $profile->update($data);
        $profile->update(['profile_completeness' => $profile->calculateCompleteness()]);

        // Met à jour user
        $user->update(['profile_type' => 'professional']);

        return response()->json([
            'success'      => true,
            'message'      => "Étape {$step} sauvegardée.",
            'data'         => ['profile' => $profile->fresh(), 'next_step' => $step + 1],
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // POST /api/professional/onboarding/complete — Finaliser
    // ══════════════════════════════════════════════════════════

    public function complete(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $profile = ProfessionalProfile::where('user_id', $user->id)->firstOrFail();
        $profile->update([
            'onboarding_completed'    => true,
            'onboarding_completed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => '✅ Onboarding professionnel complété !',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // PUT /api/professional/profile — Édition depuis Paramètres
    // Réutilise les champs de validateStep1() mais sans avancer
    // onboarding_step (contrairement à saveStep(1)).
    // ══════════════════════════════════════════════════════════

    public function updateProfile(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user    = $request->user();
        $profile = ProfessionalProfile::firstOrCreate(['user_id' => $user->id]);

        $data = $this->validateStep1($request);
        $profile->update($data);
        $profile->update(['profile_completeness' => $profile->calculateCompleteness()]);

        return response()->json([
            'success' => true,
            'message' => '✅ Profil mis à jour.',
            'data'    => ['profile' => $profile->fresh()],
        ]);
    }

    // ── Validations par étape ─────────────────────────────────

    private function validateStep1(Request $request): array
    {
        $request->validate([
            'agency_name'                => 'nullable|string|max:200',
            'professional_phone'         => 'nullable|string|max:20',
            'website'                    => 'nullable|url',
            'founded_year'               => 'nullable|integer|min:1900|max:2025',
            'activity_type'              => 'nullable|string',
            'team_size'                  => 'nullable|integer|min:1',
            'current_clients_count'      => 'nullable|integer|min:0',
            'avg_simultaneous_clients'   => 'nullable|integer|min:0',
            'active_projects'            => 'nullable|integer|min:0',
            'years_experience'           => 'nullable|integer|min:0',
        ]);
        return $request->only([
            'agency_name', 'professional_phone', 'website', 'founded_year',
            'activity_type', 'team_size', 'current_clients_count',
            'avg_simultaneous_clients', 'active_projects', 'years_experience',
        ]);
    }

    private function validateStep2(Request $request): array
    {
        $request->validate([
            'expertise_domains'       => 'nullable|array',
            'platforms_mastered'      => 'nullable|array',
            'tools_used'              => 'nullable|array',
            'certifications'          => 'nullable|array',
            'avg_monthly_ad_budget'   => 'nullable|numeric|min:0',
            'campaigns_managed_count' => 'nullable|integer|min:0',
        ]);
        return $request->only([
            'expertise_domains', 'platforms_mastered', 'tools_used',
            'certifications', 'avg_monthly_ad_budget', 'campaigns_managed_count',
        ]);
    }

    private function validateStep3(Request $request): array
    {
        $request->validate([
            'niches'       => 'nullable|array',
            'niche_details'=> 'nullable|array',
        ]);
        return $request->only(['niches', 'niche_details']);
    }

    private function validateStep4(Request $request): array
    {
        $request->validate([
            'avg_roas'                   => 'nullable|numeric|min:0',
            'avg_engagement_rate'        => 'nullable|numeric|min:0|max:100',
            'avg_follower_growth'        => 'nullable|numeric|min:0',
            'total_campaigns_done'       => 'nullable|integer|min:0',
            'monthly_ad_budget_managed'  => 'nullable|numeric|min:0',
            'client_retention_rate'      => 'nullable|numeric|min:0|max:100',
            'satisfied_clients_count'    => 'nullable|integer|min:0',
            'successful_projects_count'  => 'nullable|integer|min:0',
        ]);
        return $request->only([
            'avg_roas', 'avg_engagement_rate', 'avg_follower_growth',
            'total_campaigns_done', 'monthly_ad_budget_managed',
            'client_retention_rate', 'satisfied_clients_count', 'successful_projects_count',
        ]);
    }

    private function validateStep5(Request $request): array
    {
        $request->validate(['services' => 'nullable|array']);
        return $request->only(['services']);
    }

    private function validateStep6(Request $request): array
    {
        $request->validate(['agents_config' => 'nullable|array']);
        return $request->only(['agents_config']);
    }

    private function validateStep7(Request $request): array
    {
        $request->validate([
            'objectives'    => 'nullable|array',
            'target_clients'=> 'nullable|integer|min:0',
            'target_revenue'=> 'nullable|numeric|min:0',
        ]);
        return $request->only(['objectives', 'target_clients', 'target_revenue']);
    }
}