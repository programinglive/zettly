<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\TestCase;
use Tests\CreatesApplication;

class CliAbilityMiddlewareTest extends TestCase
{
    use CreatesApplication;

    public function test_cli_route_resolves_sanctum_abilities_middleware(): void
    {
        $this->getJson('/api/v1/dashboard')->assertUnauthorized();
    }
}
