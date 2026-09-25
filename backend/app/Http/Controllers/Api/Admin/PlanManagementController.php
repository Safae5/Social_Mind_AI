<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreatePlanRequest;
use App\Http\Requests\Admin\UpdatePlanRequest;
use App\Models\Plan;
use App\Services\Admin\PlanManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanManagementController extends Controller
{
    public function __construct(
        private readonly PlanManagementService $service,
    ) {}

    // GET /api/admin/plans — inclut les plans archivés (is_active=false)
    public function index(): JsonResponse
    {
        $plans = Plan::orderBy('sort_order')->get();

        return response()->json([
            'success' => true,
            'data'    => ['plans' => $plans],
        ]);
    }

    public function store(CreatePlanRequest $request): JsonResponse
    {
        try {
            $plan = $this->service->create($request->user(), $request->validated(), $request);
            return response()->json(['success' => true, 'data' => ['plan' => $plan]], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function update(UpdatePlanRequest $request, int $id): JsonResponse
    {
        $plan = Plan::findOrFail($id);
        try {
            $updated = $this->service->update($request->user(), $plan, $request->validated(), $request);
            return response()->json(['success' => true, 'data' => ['plan' => $updated]]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function archive(Request $request, int $id): JsonResponse
    {
        $plan = Plan::findOrFail($id);
        try {
            $updated = $this->service->archive($request->user(), $plan, $request);
            return response()->json(['success' => true, 'data' => ['plan' => $updated]]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
