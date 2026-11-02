<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ErrorPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_missing_page_renders_the_branded_404(): void
    {
        $response = $this->get('/this-page-does-not-exist');

        $response->assertNotFound();
        $response->assertSee('Page not found', false);
        $response->assertSee('Error 404', false);
        $this->assertPageIsSelfContained($response->getContent());
    }

    public function test_every_error_view_renders_and_is_self_contained(): void
    {
        // 419 cannot be triggered over HTTP in tests (Laravel disables CSRF there),
        // so the templates are rendered directly. This also covers 500 and 503,
        // which are awkward to provoke.
        $expectations = [
            403 => 'You cannot open this',
            404 => 'Page not found',
            405 => 'That action is not allowed here',
            419 => 'Your session expired',
            500 => 'Something went wrong on our side',
            503 => 'Temporarily unavailable',
        ];

        foreach ($expectations as $code => $title) {
            $response = $this->view("errors.{$code}");

            $response->assertSee($title, false);
            $response->assertSee("Error {$code}", false);
            $this->assertPageIsSelfContained(view("errors.{$code}")->render());
        }
    }

    public function test_a_forbidden_request_renders_the_403_page(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $todo = \App\Models\Todo::factory()->for($owner)->asTask()->create();

        $this->actingAs($other)
            ->put("/todos/{$todo->id}", ['title' => 'nope'])
            ->assertForbidden()
            ->assertSee('You cannot open this', false);
    }

    public function test_the_error_page_renders_without_a_vite_manifest(): void
    {
        // The whole point: a 500/503 is often caused by missing or misbuilt assets.
        // An error page that needs @vite to render would fail with the very error it
        // is meant to explain. This test deletes the manifest, proves the normal
        // page cannot render, then proves the error page still can.
        $manifest = public_path('build/manifest.json');
        $existed = file_exists($manifest);
        $backup = $existed ? file_get_contents($manifest) : null;

        if ($existed) {
            unlink($manifest);
        }

        try {
            $response = $this->get('/this-page-does-not-exist');

            $response->assertNotFound();
            $response->assertSee('Page not found', false);
            $this->assertPageIsSelfContained($response->getContent());
        } finally {
            if ($existed) {
                file_put_contents($manifest, $backup);
            }
        }
    }

    /**
     * No Vite tags, no external stylesheet, no remote font: the page must render
     * from a bare PHP process.
     */
    private function assertPageIsSelfContained(string $html): void
    {
        $this->assertStringNotContainsString('/build/assets/', $html, 'error page must not depend on built assets');
        $this->assertStringNotContainsString('fonts.bunny.net', $html, 'error page must not fetch remote fonts');
        $this->assertStringContainsString('<style>', $html, 'error page should carry its own styles');
    }
}
