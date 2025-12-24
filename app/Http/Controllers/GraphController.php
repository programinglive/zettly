<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class GraphController extends Controller
{
    /**
     * Display the graph visualization page.
     */
    public function index(): Response
    {
        $graphServiceUrl = config('services.graph.api_url', config('services.graph.url', 'http://localhost:3001'));
        $wsUrl = config('services.graph.ws_url', str_replace('http://', 'ws://', $graphServiceUrl));

        return Inertia::render('Graph/Index', [
            'graphServiceUrl' => $graphServiceUrl,
            'wsUrl' => $wsUrl,
        ]);
    }
}
