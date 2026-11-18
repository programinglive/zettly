<?php

namespace App\Http\Controllers;

use App\Domain\Priority\PriorityQueueBuilder;
use App\Domain\Priority\PrioritySettingsService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PriorityController extends Controller
{
    public function index(Request $request): Response|JsonResponse
    {
        $userId = (int) Auth::id();
        $settingsService = new PrioritySettingsService($userId);
        $settings = $settingsService->get();

        $today = $request->get('date')
            ? CarbonImmutable::parse($request->get('date'))->startOfDay()
            : CarbonImmutable::now()->startOfDay();

        $builder = new PriorityQueueBuilder(
            $userId,
            $settings,
            $today
        );

        $data = $builder->build();

        $props = [
            'today' => $data['today'],
            'next' => $data['next'],
            'proposal' => $data['proposal'],
            'triage' => $data['triage'],
            'warnings' => $data['warnings'],
        ];

        if ($request->wantsJson()) {
            return response()->json($props);
        }

        return Inertia::render('Priority/Index', $props);
    }
}
