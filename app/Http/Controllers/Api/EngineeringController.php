<?php

namespace App\Http\Controllers\Api;

use App\Domain\Engineering\EngineeringCollectorService;
use App\Domain\Engineering\EngineeringProjectRegistry;
use App\Http\Controllers\Controller;
use App\Models\EngineeringProject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EngineeringController extends Controller
{
    public function index(Request $request, EngineeringProjectRegistry $registry): JsonResponse
    {
        $projects = $registry->ensureDefaultProjects($request->user());

        return response()->json([
            'success' => true,
            'data' => $projects->map(fn (EngineeringProject $project) => $registry->summarize($project))->values()->all(),
        ]);
    }

    public function show(Request $request, EngineeringProject $project, EngineeringProjectRegistry $registry): JsonResponse
    {
        abort_unless((int) $project->user_id === (int) $request->user()->id, 404);

        return response()->json([
            'success' => true,
            'data' => $registry->summarize($project),
        ]);
    }

    public function sync(
        Request $request,
        EngineeringProject $project,
        EngineeringCollectorService $collector,
        EngineeringProjectRegistry $registry,
    ): JsonResponse {
        abort_unless((int) $project->user_id === (int) $request->user()->id, 404);

        $synced = $collector->syncProject($project);

        return response()->json([
            'success' => true,
            'data' => $registry->summarize($synced),
        ]);
    }
}
