<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Services\NotificationText;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ReportDetailsController extends Controller
{
    public function __invoke(Request $request, Report $report): View
    {
        abort_unless((int) $report->user_id === (int) $request->user()->id, 404);

        return view('reports.show', ['report' => $report, 'content' => NotificationText::redact($report->content)]);
    }
}
