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
        'dev-workflow' => '/\b(dev-workflow|devworkflow|dev workflow|devwf|managedmcp|rollout\.cjs|start_task|complete_focus|mcp server|commiter|opencode)\b/i',
        'clinic' => '/\b(clinic|timeless|ministry|room mic|receipt printer|posclinic|paratest|kasir)\b/i',
        'erp' => '/\b(erp\.beautyworld|\berp\b|frontend_erp|printer-erp|reseller\.beautyworld|btb stock|mgm\.beautyworld|force close transaction|role.*permission)\b/i',
        'hris' => '/\b(hris\.beautyworld|\bhris\b|absen|payroll|attendance)\b/i',
        'portal-beautyworld' => '/\b(portal-beautyworld|beautyworld portal|portal cloud)\b/i',
        'dbpinball' => '/\b(dbpinball|mariadb-safesync)\b/i',
        'bw-infra' => '/\b(bw-app|bw-tools|bw-server|cloudflare|tailscale|gitlab runner|github runner|central-gateway|notification[- ]hub|gcs bucket|backup|nginx|ssl|systemd|mmch|helloworld|service-account|credential)\b/i',
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

        if ($hasCanonical && empty($staleTagIds)) {
            return ['status' => 'unchanged', 'canonical' => $resolved['key'], 'attached' => false, 'detached' => []];
        }

        if (! $dryRun) {
            $canonicalTag = Tag::firstOrCreate(
                ['user_id' => $todo->user_id, 'name' => $canonicalTagName],
                ['color' => $resolved['color']]
            );
            $todo->tags()->syncWithoutDetaching([$canonicalTag->id]);

            if (! empty($staleTagIds)) {
                $todo->tags()->detach($staleTagIds);
            }
        }

        return [
            'status' => 'updated',
            'canonical' => $resolved['key'],
            'attached' => ! $hasCanonical,
            'detached' => $staleTagIds,
        ];
    }

    /**
     * Best-effort auto-tagger for newly created Todos so new work rarely falls into Unclassified.
     */
    public function autoTagIfRecognized(Todo $todo): ?string
    {
        if (! $todo->user_id || $todo->type !== Todo::TYPE_TODO) {
            return null;
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
