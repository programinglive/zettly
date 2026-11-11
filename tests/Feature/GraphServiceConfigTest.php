<?php

namespace Tests\Feature;

use Tests\TestCase;

class GraphServiceConfigTest extends TestCase
{
    public function test_graph_enabled_switch_is_declared_in_config(): void
    {
        // SyncGraphEvent reads config('services.graph.enabled') to decide whether
        // to post to the graph service. If the key is absent the operator's
        // GRAPH_SERVICE_ENABLED env var is silently ignored and the job keeps
        // posting to a dead or foreign port.
        $value = config('services.graph.enabled');

        $this->assertIsBool($value, 'services.graph.enabled must be declared and boolean.');
        $this->assertTrue($value, 'Graph sync should default to enabled when no env override is set.');
    }
}
