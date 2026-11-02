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
        // `config()` only applies its default when the key is missing, not when it
        // exists with a null value, and GRAPH_API_URL / GRAPH_WS_URL are optional.
        // Use `?:` so an unset proxy URL really does fall back.
        $graphServiceUrl = config('services.graph.api_url')
            ?: config('services.graph.url', 'http://localhost:3001');

        $wsUrl = config('services.graph.ws_url')
            ?: preg_replace('/^http(s?):\/\//', 'ws$1://', $graphServiceUrl);

        return Inertia::render('Graph/Index', [
            'graphServiceUrl' => $graphServiceUrl,
            'wsUrl' => $wsUrl,
        ]);
    }
}
