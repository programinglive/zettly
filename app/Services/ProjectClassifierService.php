<?php

namespace App\Services;

use App\Models\Tag;
use App\Models\Todo;
use Illuminate\Support\Collection;

class ProjectClassifierService
{
    /**
     * Canonical project catalog (Zettelkasten `proyek:*` axis).
     */
    private const CANONICAL_PROJECTS = [
        'zettly' => ['label' => 'Zettly', 'color' => '#F59E0B'],
        'dev-workflow' => ['label' => 'DevWorkflow', 'color' => '#EF4444'],
        'clinic' => ['label' => 'Clinic', 'color' => '#2563EB'],
        'erp' => ['label' => 'Beautyworld ERP', 'color' => '#0EA5E9'],
        'hris' => ['label' => 'Beautyworld HRIS', 'color' => '#14B8A6'],
        'portal-beautyworld' => ['label' => 'Beautyworld Portal', 'color' => '#06B6D4'],
        'dbpinball' => ['label' => 'DBPinball', 'color' => '#10B981'],
        'bw-infra' => ['label' => 'Infrastructure & Ops', 'color' => '#6366F1'],
        'programinglive' => ['label' => 'ProgramingLive & Media', 'color' => '#8B5CF6'],
    ];

    /**
     * Generic/temp folder names that must never be treated as real projects.
     */
    private const FORBIDDEN_SLUGS = [
        'project',
        'repo',
        'r',
        'wt-poc',
        'brainstorming',
        'general',
        'unassigned',
        'misc',
        'other',
        'test',
        'tmp',
        'temp',
        'unknown',
        'none',
    ];

    /**
     * Exact legacy tag slug => canonical project slug.
     */
    private const EXACT_ALIASES = [
        'xiaomi-pad-overflow' => 'zettly',
        'daily-activity-journal' => 'zettly',
        'commiter' => 'dev-workflow',
        'devpos' => 'clinic',
        'frontend_erp' => 'erp',
        'printer-erp' => 'erp',
        'google-cloud-portal' => 'portal-beautyworld',
        'ci-cd' => 'bw-infra',
        'ci-templates' => 'bw-infra',
        'central-mcp-gateway' => 'bw-infra',
        'notification-hub' => 'bw-infra',
        'workstation-tooling' => 'bw-infra',
        'mac' => 'bw-infra',
        'mahatmamahardhikach' => 'programinglive',
        'tiktok-downloader' => 'programinglive',
        'brain-reading-library' => 'programinglive',
        'personal-ai-bridge' => 'programinglive',
        'pwa-foundation' => 'programinglive',
    ];

    /**
     * Prefix rules (slug starts with prefix) => canonical project slug.
     */
    private const PREFIX_ALIASES = [
        'zettly' => 'zettly',
        'dev-workflow' => 'dev-workflow',
        'devwf' => 'dev-workflow',
        'devworkflow' => 'dev-workflow',
        'refine-with-ai' => 'dev-workflow',
        'live-gov-cli' => 'dev-workflow',
        'clinic' => 'clinic',
        'timeless' => 'clinic',
        'erp' => 'erp',
        'reseller' => 'erp',
        'hris' => 'hris',
        'portal-beautyworld' => 'portal-beautyworld',
        'dbpinball' => 'dbpinball',
        'bw-' => 'bw-infra',
        'infra-knowledge' => 'bw-infra',
        'grooming-' => 'bw-infra',
        'windows-scheduler' => 'bw-infra',
        'android-remote-device-hub' => 'bw-infra',
        'programinglive' => 'programinglive',
    ];

    /**
     * Keyword regex rules for classifying untagged / placeholder tasks from Focus/Title/Description.
     */
    private const TEXT_RULES = [
        'zettly' => '/\b(zettly|zettelkasten|tldraw|reverb|priority queue|eisenhower|today dashboard|coding agent|daily activity journal)\b/i',
        'dev-workflow' => '/\b(dev-workflow|devworkflow|dev workflow|devwf|managedmcp|rollout\.cjs|start_task|complete_focus|mcp server|commiter|opencode|reaper)\b/i',
        'clinic' => '/\b(clinic|timeless|ministry|room mic|receipt printer|posclinic|paratest|kasir)\b/i',
        'erp' => '/\b(erp\.beautyworld|\berp\b|frontend_erp|printer-erp|reseller\.beautyworld|btb stock|mgm\.beautyworld|force close transaction|role.*permission)\b/i',
        'hris' => '/\b(hris\.beautyworld|\bhris\b|absen|payroll|attendance)\b/i',
        'portal-beautyworld' => '/\b(portal-beautyworld|beautyworld portal|portal cloud)\b/i',
        'dbpinball' => '/\b(dbpinball|mariadb-safesync)\b/i',
        'bw-infra' => '/\b(bw-app|bw-tools|bw-server|cloudflare|tailscale|gitlab runner|github runner|central-gateway|notification[- ]hub|gcs bucket|backup|nginx|ssl|systemd|mmch|helloworld|service-account|credential|cloud\s+computing|journald|discord|notifikasi)\b/i',
        'programinglive' => '/\b(programinglive|tiktok-downloader|mahatmamahardhika|portfolio|youtube|content|marketing|detak|logo generator|remove background|slider image|light box|transpile|parser.*html|parses on web)\b/i',
    ];

    /**
     * Secondary Zettelkasten `area:*` tag fallback when no `proyek:*` or explicit text matched.
     */
    private const AREA_FALLBACKS = [
        'area:zettly' => 'zettly',
        'area:mcp' => 'dev-workflow',
        'area:cli' => 'dev-workflow',
        'area:erp' => 'erp',
        'area:hris' => 'hris',
        'area:infra' => 'bw-infra',
        'area:notification' => 'bw-infra',
        'area:marketing' => 'programinglive',
        'area:content' => 'programinglive',
        'area:tutorial' => 'programinglive',
        'area:web' => 'programinglive',
        'area:image' => 'programinglive',
        'area:project' => 'programinglive',
    ];

    /**
     * Generic/meaningless `tipe:*` slugs that must never be attached.
     */
    private const FORBIDDEN_TYPE_SLUGS = [
        'other',
        'misc',
        'general',
        'unknown',
        'none',
    ];

    /**
     * Shorthand duplicate `tipe:*` aliases => explicit canonical work type.
     */
    private const TYPE_ALIASES = [
        'feat' => 'feature',
        'fix' => 'bugfix',
    ];

    /**
     * Colors for explicit canonical `tipe:*` tags.
     */
    private const WORK_TYPE_COLORS = [
        'feature' => '#06B6D4',
        'bugfix' => '#EF4444',
        'audit' => '#8B5CF6',
        'ops' => '#6366F1',
        'refactor' => '#10B981',
        'docs' => '#0EA5E9',
        'chore' => '#F59E0B',
        'note' => '#64748B',
    ];

    /**
     * Infer an explicit, meaningful canonical `tipe:*` work type from a Todo/Note.
     * Never returns `other`.
     */
    public function classifyWorkType(Todo $todo): string
    {
        if ($todo->type === Todo::TYPE_NOTE) {
            return 'note';
        }

        $haystack = trim(((string) $todo->title).' '.strip_tags((string) $todo->description));

        $rules = [
            'audit' => '/\b(audit|scan|inspect|verify|verification|review|check|compliance|diagnos|health|inventory|drift)\b/i',
            'bugfix' => '/\b(fix|bug|bugfix|error|crash|regression|repair|broken|500|502|404|403|401|422|hotfix|incident|troubleshoot|debug|fail)\b/i',
            'ops' => '/\b(deploy|release|backup|restore|migrat|server|runner|ssl|dns|gcs|bucket|infra|rollback|webhook|cron|systemd|nginx|tailscale|cloudflare|npm|unpublish|publish)\b/i',
            'refactor' => '/\b(refactor|cleanup|clean up|simplify|normaliz|decoupl|standardiz|overhaul|revamp|align|eliminat)\b/i',
            'docs' => '/\b(docs|readme|changelog|spec|guide|tutorial|handover|briefing|documentation)\b/i',
            'feature' => '/\b(add|build|create|implement|feature|dashboard|ui\/ux|split view|calendar|chart|endpoint|support|enable|integrate|auto-tag)\b/i',
        ];

        foreach ($rules as $type => $pattern) {
            if (preg_match($pattern, $haystack) === 1) {
                return $type;
            }
        }

        return 'chore';
    }

    /**
     * Resolve explicit `tipe:*` normalization actions for a Todo/Note.
     *
     * @return array{target_type: ?string, stale_type_ids: array<int, int>, needs_update: bool}
     */
    private function resolveWorkTypeNormalization(Todo $todo, Collection $tags): array
    {
        $typeTags = $tags->filter(fn ($tag) => str_starts_with(strtolower((string) $tag->name), 'tipe:'));
        $staleTypeIds = [];
        $validTypes = [];
        $aliasedTargets = [];

        foreach ($typeTags as $tag) {
            $slug = strtolower(trim(substr((string) $tag->name, strlen('tipe:'))));
            if ($slug === '' || in_array($slug, self::FORBIDDEN_TYPE_SLUGS, true)) {
                $staleTypeIds[] = (int) $tag->id;
            } elseif (isset(self::TYPE_ALIASES[$slug])) {
                $staleTypeIds[] = (int) $tag->id;
                $aliasedTargets[] = self::TYPE_ALIASES[$slug];
            } else {
                $validTypes[] = $slug;
            }
        }

        $targetType = null;
        if (empty($validTypes)) {
            $targetType = $aliasedTargets[0] ?? $this->classifyWorkType($todo);
        } elseif (! empty($aliasedTargets) && ! in_array($aliasedTargets[0], $validTypes, true)) {
            $targetType = $aliasedTargets[0];
        }

        return [
            'target_type' => $targetType,
            'stale_type_ids' => array_values(array_unique($staleTypeIds)),
            'needs_update' => $targetType !== null || ! empty($staleTypeIds),
        ];
    }

    /**
     * Vague/meaningless `area:*` slugs that must be replaced with explicit domain areas.
     */
    private const FORBIDDEN_AREA_SLUGS = [
        'dev',
        'apps',
        'project',
        'general',
        'other',
        'misc',
    ];

    /**
     * Infer an explicit domain `area:*` slug when replacing vague tags like `area:dev`.
     */
    public function classifyArea(Todo $todo): string
    {
        $haystack = trim(((string) $todo->title).' '.strip_tags((string) $todo->description));

        $rules = [
            'notification' => '/\b(notification|notifikasi|discord|pusher|email|push|alert)\b/i',
            'database' => '/\b(database|postgres|pgsql|mysql|mariadb|sqlite|schema|migration|pg_dump|mysqldump|backup|query|table|sql)\b/i',
            'ui-ux' => '/\b(ui\/ux|\bui\b|\bux\b|layout|typography|split view|master-detail|sidebar|modal|dashboard|chart|theme|dark mode|tailwind)\b/i',
            'security' => '/\b(security|credential|secret|token|auth|permission|role|csrf|xss|ssl|tls)\b/i',
            'deploy' => '/\b(deploy|release|ci\/cd|pipeline|runner|gitlab|github|npm|publish|unpublish|rollback|rollout|webhook)\b/i',
            'infra' => '/\b(infra|server|bw-app|bw-tools|bw-server|mmch|nginx|systemd|tailscale|cloudflare|dns|gcs|bucket|cloud|vm|journald)\b/i',
            'mcp' => '/\b(mcp|dev-workflow|central-gateway|start_task|complete_focus)\b/i',
            'cli' => '/\b(cli|artisan|command|terminal|script)\b/i',
            'frontend' => '/\b(react|inertia|vite|jsx|tsx|pwa|browser|frontend|component)\b/i',
        ];

        foreach ($rules as $area => $pattern) {
            if (preg_match($pattern, $haystack) === 1) {
                return $area;
            }
        }

        return 'backend';
    }

    /**
     * Resolve vague `area:*` cleanup actions for a Todo/Note.
     *
     * @return array{target_area: ?string, stale_area_ids: array<int, int>, needs_update: bool}
     */
    private function resolveAreaNormalization(Todo $todo, Collection $tags): array
    {
        $areaTags = $tags->filter(fn ($tag) => str_starts_with(strtolower((string) $tag->name), 'area:'));
        $staleAreaIds = [];
        $validAreas = [];

        foreach ($areaTags as $tag) {
            $slug = strtolower(trim(substr((string) $tag->name, strlen('area:'))));
            if ($slug === '' || in_array($slug, self::FORBIDDEN_AREA_SLUGS, true)) {
                $staleAreaIds[] = (int) $tag->id;
            } else {
                $validAreas[] = $slug;
            }
        }

        $targetArea = null;
        if (! empty($staleAreaIds) && empty($validAreas)) {
            $targetArea = $this->classifyArea($todo);
        }

        return [
            'target_area' => $targetArea,
            'stale_area_ids' => array_values(array_unique($staleAreaIds)),
            'needs_update' => ! empty($staleAreaIds),
        ];
    }

    public function canonicalCatalog(): array
    {
        return self::CANONICAL_PROJECTS;
    }

    public function isForbiddenSlug(string $slug): bool
    {
        return in_array(strtolower(trim($slug)), self::FORBIDDEN_SLUGS, true);
    }

    /**
     * Normalize a raw `proyek:` slug into its canonical project slug.
     * Returns null when the slug is empty or a forbidden generic placeholder.
     */
    public function normalizeSlug(string $rawSlug): ?string
    {
        $slug = strtolower(trim($rawSlug));
        if (str_starts_with($slug, 'proyek:')) {
            $slug = trim(substr($slug, strlen('proyek:')));
        }
        if ($slug === '' || $this->isForbiddenSlug($slug)) {
            return null;
        }
        if (isset(self::CANONICAL_PROJECTS[$slug])) {
            return $slug;
        }
        if (isset(self::EXACT_ALIASES[$slug])) {
            return self::EXACT_ALIASES[$slug];
        }
        foreach (self::PREFIX_ALIASES as $prefix => $canonical) {
            if (str_starts_with($slug, $prefix)) {
                return $canonical;
            }
        }

        return $slug;
    }

    /**
     * Infer a canonical project slug from natural text (Focus title, Todo title/description).
     */
    public function inferFromText(string $text): ?string
    {
        $clean = trim($text);
        if ($clean === '') {
            return null;
        }

        foreach (self::TEXT_RULES as $canonical => $pattern) {
            if (preg_match($pattern, $clean) === 1) {
                return $canonical;
            }
        }

        return null;
    }

    /**
     * Resolve the canonical project metadata for a Todo (or null if genuinely unclassified).
     *
     * Priority order:
     * 1. Valid non-placeholder `proyek:*` tag (normalized to canonical slug)
     * 2. Linked Focus title
     * 3. Todo title + description
     */
    public function classifyTodo(Todo $todo): ?array
    {
        $tags = $todo->relationLoaded('tags') ? $todo->tags : $todo->tags()->get(['tags.id', 'tags.name', 'tags.color']);
        $projectTags = $tags->filter(fn ($tag) => str_starts_with(strtolower((string) $tag->name), 'proyek:'));

        foreach ($projectTags as $tag) {
            $canonical = $this->normalizeSlug((string) $tag->name);
            if ($canonical !== null) {
                return $this->describeProject($canonical, (int) $tag->id, $tag->color ?: null);
            }
        }

        $focusTitle = $todo->relationLoaded('focus')
            ? (string) ($todo->focus?->title ?? '')
            : (string) ($todo->focus()->value('title') ?? '');

        if ($focusTitle !== '') {
            $fromFocus = $this->inferFromText($focusTitle);
            if ($fromFocus !== null) {
                return $this->describeProject($fromFocus);
            }
        }

        $fromText = $this->inferFromText(trim((string) $todo->title.' '.(string) $todo->description));
        if ($fromText !== null) {
            return $this->describeProject($fromText);
        }

        foreach ($tags as $tag) {
            $tagName = strtolower((string) $tag->name);
            if (isset(self::AREA_FALLBACKS[$tagName])) {
                return $this->describeProject(self::AREA_FALLBACKS[$tagName]);
            }
        }

        return null;
    }

    /**
     * Ensure a Todo carries its canonical `proyek:<slug>` tag and remove any
     * forbidden placeholder or legacy alias `proyek:*` tags.
     */
    public function ensureCanonicalTagForTodo(Todo $todo, bool $dryRun = false): array
    {
        $resolved = $this->classifyTodo($todo);
        $tags = $todo->tags()->get(['tags.id', 'tags.name']);
        $projectTags = $tags->filter(fn ($tag) => str_starts_with(strtolower((string) $tag->name), 'proyek:'));

        if ($resolved === null) {
            return ['status' => 'unclassified', 'canonical' => null, 'attached' => false, 'detached' => []];
        }

        $canonicalTagName = 'proyek:'.$resolved['key'];
        $hasCanonical = $projectTags->contains(fn ($tag) => strtolower((string) $tag->name) === $canonicalTagName);
        $staleTagIds = $projectTags
            ->filter(fn ($tag) => strtolower((string) $tag->name) !== $canonicalTagName)
            ->pluck('id')
            ->all();

        $typePlan = $this->resolveWorkTypeNormalization($todo, $tags);
        $areaPlan = $this->resolveAreaNormalization($todo, $tags);

        if ($hasCanonical && empty($staleTagIds) && ! $typePlan['needs_update'] && ! $areaPlan['needs_update']) {
            return ['status' => 'unchanged', 'canonical' => $resolved['key'], 'attached' => false, 'detached' => []];
        }

        $allStaleIds = array_values(array_unique(array_merge(
            $staleTagIds,
            $typePlan['stale_type_ids'],
            $areaPlan['stale_area_ids']
        )));

        if (! $dryRun) {
            $canonicalTag = Tag::firstOrCreate(
                ['user_id' => $todo->user_id, 'name' => $canonicalTagName],
                ['color' => $resolved['color']]
            );
            $todo->tags()->syncWithoutDetaching([$canonicalTag->id]);

            if (! empty($allStaleIds)) {
                $todo->tags()->detach($allStaleIds);
            }

            if ($typePlan['target_type'] !== null) {
                $typeSlug = $typePlan['target_type'];
                $typeTag = Tag::firstOrCreate(
                    ['user_id' => $todo->user_id, 'name' => 'tipe:'.$typeSlug],
                    ['color' => self::WORK_TYPE_COLORS[$typeSlug] ?? '#64748B']
                );
                $todo->tags()->syncWithoutDetaching([$typeTag->id]);
            }

            if ($areaPlan['target_area'] !== null) {
                $areaTag = Tag::firstOrCreate(
                    ['user_id' => $todo->user_id, 'name' => 'area:'.$areaPlan['target_area']],
                    ['color' => '#64748B']
                );
                $todo->tags()->syncWithoutDetaching([$areaTag->id]);
            }
        }

        return [
            'status' => 'updated',
            'canonical' => $resolved['key'],
            'attached' => ! $hasCanonical || $typePlan['target_type'] !== null || $areaPlan['target_area'] !== null,
            'detached' => $allStaleIds,
        ];
    }

    /**
     * Best-effort auto-tagger for newly created Todos and Notes so Zettelkasten coordinates
     * (canonical proyek:* + explicit non-other tipe:* + explicit area:*) are always attached automatically.
     */
    public function autoTagIfRecognized(Todo $todo): ?string
    {
        if (! $todo->user_id || ! in_array($todo->type, [Todo::TYPE_TODO, Todo::TYPE_NOTE], true)) {
            return null;
        }

        $existingTags = $todo->relationLoaded('tags')
            ? $todo->tags
            : $todo->tags()->get(['tags.id', 'tags.name', 'tags.color']);

        $typePlan = $this->resolveWorkTypeNormalization($todo, $existingTags);
        $areaPlan = $this->resolveAreaNormalization($todo, $existingTags);

        $staleIds = array_values(array_unique(array_merge(
            $typePlan['stale_type_ids'],
            $areaPlan['stale_area_ids']
        )));
        if (! empty($staleIds)) {
            $todo->tags()->detach($staleIds);
        }
        if ($typePlan['target_type'] !== null) {
            $typeSlug = $typePlan['target_type'];
            $typeTag = Tag::firstOrCreate(
                ['user_id' => $todo->user_id, 'name' => 'tipe:'.$typeSlug],
                ['color' => self::WORK_TYPE_COLORS[$typeSlug] ?? '#64748B']
            );
            $todo->tags()->syncWithoutDetaching([$typeTag->id]);
        }
        if ($areaPlan['target_area'] !== null) {
            $areaTag = Tag::firstOrCreate(
                ['user_id' => $todo->user_id, 'name' => 'area:'.$areaPlan['target_area']],
                ['color' => '#64748B']
            );
            $todo->tags()->syncWithoutDetaching([$areaTag->id]);
        }

        $resolved = $this->classifyTodo($todo);
        if ($resolved === null) {
            return null;
        }

        $canonicalTagName = 'proyek:'.$resolved['key'];
        $tag = Tag::firstOrCreate(
            ['user_id' => $todo->user_id, 'name' => $canonicalTagName],
            ['color' => $resolved['color']]
        );
        $todo->tags()->syncWithoutDetaching([$tag->id]);

        return $resolved['key'];
    }

    public function describeProject(string $canonicalKey, ?int $tagId = null, ?string $fallbackColor = null): array
    {
        $meta = self::CANONICAL_PROJECTS[$canonicalKey] ?? null;

        return [
            'key' => $canonicalKey,
            'label' => $meta['label'] ?? $canonicalKey,
            'color' => $meta['color'] ?? $fallbackColor ?? '#64748B',
            'tag_id' => $tagId,
        ];
    }
}
