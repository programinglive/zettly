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

    public function syncCodeGraph(Request $request, EngineeringProjectRegistry $registry): JsonResponse
    {
        $validated = $request->validate([
            'slug' => 'nullable|string|max:120',
            'repo_full_name' => 'nullable|string|max:190',
            'name' => 'nullable|string|max:190',
            'provider' => 'nullable|string|max:40',
            'version' => 'nullable|string|max:60',
            'revision' => 'nullable|string|max:64',
            'branch' => 'nullable|string|max:120',
            'machine' => 'nullable|string|max:120',
            'freshness_status' => 'nullable|string|max:40',
            'stats' => 'nullable|array',
            'annotations' => 'nullable|array',
            'bug_fixes' => 'nullable|array',
        ]);

        if (empty($validated['slug']) && empty($validated['repo_full_name'])) {
            return response()->json([
                'success' => false,
                'message' => 'Either slug or repo_full_name is required.',
            ], 422);
        }

        $project = $registry->syncCodeGraph($request->user(), $validated);

        return response()->json([
            'success' => true,
            'data' => $registry->summarize($project),
        ]);
    }
}
