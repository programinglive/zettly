<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * The debug panel is gated in JavaScript, so this test guards the source rather
 * than the runtime: the gate used to be `!isSuperAdmin && !debugEnabled`, which
 * means a normal user with `zettly-debug-mode=true` in localStorage passed it and
 * mounted ReorderDebug - the component that monkey-patches window.router.post.
 */
class DebugPanelGateTest extends TestCase
{
    public function test_the_debug_panel_requires_a_super_admin(): void
    {
        foreach (['resources/js/Pages/Dashboard.jsx', 'resources/js/Pages/Todos/Board.jsx'] as $file) {
            $source = file_get_contents(base_path($file));

            // Match the code, not the prose: the explanatory comment quotes the old
            // condition on purpose.
            $this->assertStringNotContainsString(
                'if (!isSuperAdmin && !debugEnabled)',
                $source,
                "{$file} still lets a non-super-admin enable the debug panel through localStorage."
            );

            $this->assertStringContainsString(
                'if (!isSuperAdmin)',
                $source,
                "{$file} should bail out for non-super-admins."
            );
        }
    }

    public function test_reorder_debug_restores_the_router_method_it_replaced(): void
    {
        $source = file_get_contents(base_path('resources/js/Components/ReorderDebug.jsx'));

        // Without a restore, the monkey-patch outlives the component for the whole
        // SPA session.
        $this->assertStringContainsString(
            'window.router.post = originalPost',
            $source,
            'ReorderDebug must put window.router.post back when it unmounts.'
        );
    }
}