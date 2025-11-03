<?php

namespace Tests\Unit;

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Http\Request;
use Tests\TestCase;

class HandleInertiaRequestsTest extends TestCase
{
    public function test_share_includes_csrf_token(): void
    {
        $middleware = new HandleInertiaRequests();

        $this->app['session']->start();
        $expectedToken = csrf_token();

        $request = Request::create('/todos', 'GET');
        $request->setUserResolver(fn () => null);

        $shared = $middleware->share($request);

        $this->assertArrayHasKey('csrf_token', $shared);
        $this->assertSame($expectedToken, $shared['csrf_token']);
    }
}
