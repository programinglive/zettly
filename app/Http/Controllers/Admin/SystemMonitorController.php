<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SystemMonitorController extends Controller
{
    public function __invoke(Request $request): Response
    {
        return Inertia::render('Admin/SystemMonitor', [
            'appVersion' => config('app.version', 'unknown'),
            'environment' => config('app.env', 'unknown'),
            'debug' => config('app.debug', false),
        ]);
    }
}
