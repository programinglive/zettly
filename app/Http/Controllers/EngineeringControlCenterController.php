<?php

namespace App\Http\Controllers;

use App\Domain\Engineering\EngineeringProjectRegistry;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EngineeringControlCenterController extends Controller
{
    public function index(Request $request, EngineeringProjectRegistry $registry): Response
    {
        $user = $request->user();
        $projects = $registry->ensureDefaultProjects($user);

        return Inertia::render('Engineering/Index', [
            'projects' => $projects->map(fn ($project) => $registry->summarize($project))->values()->all(),
            'canSync' => true,
        ]);
    }
}
