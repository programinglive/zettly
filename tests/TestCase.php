<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\SkipsViteWhenUnbuilt;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;
    use SkipsViteWhenUnbuilt;

    protected function setUp(): void
    {
        parent::setUp();

        // The graph service is decorative and runs outside the test process. Todo
        // writes dispatch SyncGraphEvent and the suite uses the sync queue, so
        // without this every test that touches a todo would open a socket to
        // localhost:3001. Tests that need their own stubs call Http::fake() again,
        // which replaces this one.
        Http::fake([
            'http://localhost:3001/*' => Http::response(['success' => true]),
        ]);
    }
}
