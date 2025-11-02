<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CompressResponse
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Check if client accepts gzip encoding
        if (strpos($request->header('Accept-Encoding'), 'gzip') !== false) {
            // Only compress text-based responses
            $contentType = $response->headers->get('Content-Type', '');
            if (strpos($contentType, 'text') !== false ||
                strpos($contentType, 'application/json') !== false ||
                strpos($contentType, 'application/javascript') !== false) {

                $response->setContent(gzencode($response->getContent(), 9));
                $response->headers->set('Content-Encoding', 'gzip');
                $response->headers->set('Content-Length', strlen($response->getContent()));
            }
        }

        return $response;
    }
}
