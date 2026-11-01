<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Guards the fix in Tests\Concerns\SkipsViteWhenUnbuilt.
 *
 * Before that trait existed, a fresh clone could not render a single Inertia
 * page in tests: the compiled manifest is git-ignored, so every request threw
 * and 51 tests failed with "Vite manifest not found". The failures looked like
 * application bugs but were purely a missing build artifact.
 *
 * These tests assert that an Inertia page renders with HTTP 200 whether or not
 * the frontend has been built.
 */
class InertiaRendersWithoutBuiltAssetsTest extends TestCase
{
    public function test_inertia_page_renders_when_vite_manifest_is_missing(): void
    {
        $manifest = public_path('build/manifest.json');

        if (is_file($manifest)) {
            $this->markTestSkipped('Frontend is built; the unbuilt path cannot be exercised.');
        }

        $response = $this->get('/login');

        $response->assertOk();
    }

    public function test_vite_is_not_stubbed_when_a_real_manifest_exists(): void
    {
        if (! is_file(public_path('build/manifest.json'))) {
            $this->markTestSkipped('Frontend is not built; nothing to compare against.');
        }

        $response = $this->get('/login');

        $response->assertOk();
        $this->assertStringContainsString(
            '/build/assets/',
            $response->getContent(),
            'Real Vite tags must be rendered when a manifest exists.'
        );
    }
}
