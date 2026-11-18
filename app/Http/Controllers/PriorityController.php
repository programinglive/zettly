<?php

namespace App\Http\Controllers;

use App\Domain\Priority\PriorityQueueBuilder;
use App\Domain\Priority\PrioritySettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PriorityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = Auth::id();
        $settingsService = new PrioritySettingsService($userId);
        $settings = $settingsService->get();

        $builder = new PriorityQueueBuilder(
            $userId,
            $settings,
            $request->get('date') ?? now()->format('Y-m-d')
        );

        $data = $builder->build();

        // Format the data for the Inertia page
        return response()->json([
            'today' => $data['today'],
            'next' => $data['next'],
            'proposal' => $data['proposal'],
            'triage' => $data['triage'],
            'warnings' => $data['warnings'],
        ]);
    }
}
