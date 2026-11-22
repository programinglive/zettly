<?php

namespace App\Http\Controllers;

use App\Services\WorkspaceSummaryService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SummaryController extends Controller
{
    public function __invoke(Request $request, WorkspaceSummaryService $summaryService): Response
    {
        $days = (int) $request->query('days', 30);
        if (! in_array($days, [7, 30, 90], true)) {
            $days = 30;
        }

        return Inertia::render('Summary/Index', [
            'days' => $days,
            'summary' => $summaryService->build($request->user(), $days),
        ]);
    }
}
