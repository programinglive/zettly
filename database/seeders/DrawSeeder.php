<?php

namespace Database\Seeders;

use App\Models\Drawing;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DrawSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();

        if ($users->isEmpty()) {
            $users = User::factory(3)->create();
        }

        $users->each(function (User $user, int $index) {
            $this->seedWorkspaceSketch($user, $index);
            $this->seedMindMap($user, $index);
            $this->seedWireframe($user, $index);
        });
    }

    protected function seedWorkspaceSketch(User $user, int $index): void
    {
        Drawing::updateOrCreate(
            [
                'user_id' => $user->id,
                'title' => 'Workspace layout sketch',
            ],
            [
                'document' => $this->baseDocument([
                    'shape-workspace' => $this->shape('geo', [
                        'x' => -120,
                        'y' => -40,
                        'props' => [
                            'text' => 'Workspace zones',
                            'fill' => '#93C5FD',
                        ],
                    ]),
                    'shape-kanban' => $this->shape('geo', [
                        'x' => 60,
                        'y' => 20,
                        'props' => [
                            'text' => 'Kanban board',
                            'fill' => '#FACC15',
                        ],
                    ]),
                ], $index),
                'created_at' => Carbon::now()->subDays($index + 1),
                'updated_at' => Carbon::now()->subDays($index + 1),
            ]
        );
    }

    protected function seedMindMap(User $user, int $index): void
    {
        Drawing::updateOrCreate(
            [
                'user_id' => $user->id,
                'title' => 'Focus ideas mind map',
            ],
            [
                'document' => $this->baseDocument([
                    'shape-core' => $this->shape('geo', [
                        'props' => [
                            'text' => 'Daily Focus',
                            'fill' => '#34D399',
                        ],
                    ]),
                    'shape-branch-1' => $this->shape('geo', [
                        'x' => -150,
                        'y' => 120,
                        'props' => [
                            'text' => 'Customer research',
                        ],
                    ]),
                    'shape-branch-2' => $this->shape('geo', [
                        'x' => 160,
                        'y' => 110,
                        'props' => [
                            'text' => 'Product metrics',
                        ],
                    ]),
                ], $index + 1),
                'created_at' => Carbon::now()->subDays($index + 2),
                'updated_at' => Carbon::now()->subDays($index + 2),
            ]
        );
    }

    protected function seedWireframe(User $user, int $index): void
    {
        Drawing::updateOrCreate(
            [
                'user_id' => $user->id,
                'title' => 'Dashboard wireframe',
            ],
            [
                'document' => $this->baseDocument([
                    'shape-header' => $this->shape('geo', [
                        'width' => 600,
                        'height' => 80,
                        'props' => [
                            'text' => 'Header',
                            'fill' => '#E5E7EB',
                        ],
                    ]),
                    'shape-panel' => $this->shape('geo', [
                        'y' => 160,
                        'width' => 580,
                        'height' => 320,
                        'props' => [
                            'text' => 'Main panel',
                            'fill' => '#BFDBFE',
                        ],
                    ]),
                ], $index + 2),
                'created_at' => Carbon::now()->subDays($index + 3),
                'updated_at' => Carbon::now()->subDays($index + 3),
            ]
        );
    }

    protected function baseDocument(array $shapes, int $seedOffset = 0): array
    {
        return [
            'schema' => [
                'version' => 1,
            ],
            'store' => [
                'shape' => $shapes,
                'instance' => [],
                'camera' => [
                    'viewport' => [
                        'x' => 0,
                        'y' => 0,
                        'z' => 1,
                    ],
                ],
                'page' => [],
                'page_state' => [
                    'current_page_id' => 'page-'.($seedOffset + 1),
                ],
                'asset' => [],
            ],
        ];
    }

    protected function shape(string $type, array $overrides = []): array
    {
        return array_merge([
            'type' => $type,
            'x' => $overrides['x'] ?? 0,
            'y' => $overrides['y'] ?? 0,
            'rotation' => $overrides['rotation'] ?? 0,
            'width' => $overrides['width'] ?? 240,
            'height' => $overrides['height'] ?? 120,
            'props' => array_merge([
                'text' => 'Shape',
                'fill' => '#F3F4F6',
            ], $overrides['props'] ?? []),
        ], $overrides);
    }
}
