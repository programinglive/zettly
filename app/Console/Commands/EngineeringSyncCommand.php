<?php

namespace App\Console\Commands;

use App\Domain\Engineering\EngineeringCollectorService;
use App\Domain\Engineering\EngineeringProjectRegistry;
use App\Models\EngineeringProject;
use App\Models\User;
use Illuminate\Console\Command;

class EngineeringSyncCommand extends Command
{
    protected $signature = 'zettly:engineering-sync {--user= : User ID to sync} {--project= : Project slug to sync}';

    protected $description = 'Synchronize Engineering Control Center project telemetry from configured collectors.';

    public function handle(EngineeringProjectRegistry $registry, EngineeringCollectorService $collector): int
    {
        $userId = $this->option('user');
        $slug = $this->option('project');

        if ($userId) {
            $user = User::findOrFail((int) $userId);
            $registry->ensureDefaultProjects($user);
        }

        $query = EngineeringProject::query()
            ->when($userId, fn ($q) => $q->where('user_id', (int) $userId))
            ->when($slug, fn ($q) => $q->where('slug', $slug));

        $projects = $query->get();
        $rows = [];
        foreach ($projects as $project) {
            $synced = $collector->syncProject($project);
            $rows[] = [
                'id' => $synced->id,
                'slug' => $synced->slug,
                'github_status' => $synced->github_status,
                'latest_release_tag' => $synced->latest_release_tag,
                'deployed_tag' => $synced->deployed_tag,
            ];
        }

        $this->line(json_encode(['synced' => count($rows), 'projects' => $rows], JSON_PRETTY_PRINT));

        return self::SUCCESS;
    }
}
