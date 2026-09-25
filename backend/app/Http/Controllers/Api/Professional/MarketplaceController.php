<?php

namespace App\Http\Controllers\Api\Professional;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Marketplace (§11.5 du CDC) : profil public d'agence, portfolio,
 * témoignages, études de cas.
 *
 * Décision produit (2026-08-28) : la spec ne place cette fonctionnalité
 * ni dans le MVP (§12.1) ni dans le Phase 2 (§12.2) — voir CLAUDE.md,
 * règle 17. En attendant un arbitrage produit explicite, ces routes
 * répondent 501 plutôt que de planter (méthodes non définies).
 * Le schéma existant (MarketplaceProfile, migration) est conservé tel
 * quel pour ne pas perdre ce travail si la fonctionnalité est activée.
 */
class MarketplaceController extends Controller
{
    private function notAvailable(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Marketplace n\'est pas encore disponible — fonctionnalité en attente d\'arbitrage produit.',
            'code'    => 'FEATURE_DEFERRED',
        ], 501);
    }

    public function getProfile(Request $request): JsonResponse
    {
        return $this->notAvailable();
    }

    public function saveProfile(Request $request): JsonResponse
    {
        return $this->notAvailable();
    }

    public function addPortfolioItem(Request $request): JsonResponse
    {
        return $this->notAvailable();
    }

    public function updatePortfolioItem(Request $request, int $id): JsonResponse
    {
        return $this->notAvailable();
    }

    public function deletePortfolioItem(Request $request, int $id): JsonResponse
    {
        return $this->notAvailable();
    }

    public function addTestimonial(Request $request): JsonResponse
    {
        return $this->notAvailable();
    }

    public function updateTestimonial(Request $request, int $id): JsonResponse
    {
        return $this->notAvailable();
    }

    public function deleteTestimonial(Request $request, int $id): JsonResponse
    {
        return $this->notAvailable();
    }

    public function addCaseStudy(Request $request): JsonResponse
    {
        return $this->notAvailable();
    }

    public function updateCaseStudy(Request $request, int $id): JsonResponse
    {
        return $this->notAvailable();
    }

    public function deleteCaseStudy(Request $request, int $id): JsonResponse
    {
        return $this->notAvailable();
    }
}
