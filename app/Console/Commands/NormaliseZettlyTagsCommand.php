<?php

namespace App\Console\Commands;

use App\Models\Tag;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Bring every legacy tag onto the four canonical axes, then remove the ones
 * that are safely redundant.
 *
 * WHY (owner instruction, 10 November 2026)
 * -----------------------------------------
 * "Make everything line up and have a home that is easy to understand. If a tag
 * really needs deleting, that is fine — what matters is that you understand it
 * should be related."
 *
 * The backlog carried 33 free-form tags (`main`, `master`, `@journal`, `dev`,
 * `—`, `codex/...`). None of them can be walked the way the zettelkasten method
 * needs, because a reader cannot tell whether `main` means a branch, a project
 * or a person. Each one maps onto an axis:
 *
 *   branch names (main, master, fix/..., codex/...)  -> proyek:<repo> they name
 *   topics (dev, web, todo, zettly, erp, mcp, ...)   -> area:<topic>
 *   people/accounts (programinglive, timeless)       -> proyek:<name>
 *   the `@journal` marker                            -> tipe:journal
 *   `—` (a literal dash used as "none")              -> tipe:todo
 *
 * SAFETY, IN ORDER
 * ----------------
 * 1. Every record with a legacy tag first receives the canonical tag it maps to.
 * 2. Only then may the legacy tag be deleted, and only when EVERY record that
 *    carried it still has at least one canonical tag afterwards.
 * 3. A tag that cannot be mapped is left alone and reported, because deleting
 *    it would drop information nobody wrote down twice.
 *
 * This is why the normalisation runs as one command in one order: doing the
 * delete first would strand 36 records that carried nothing but `@journal`.
 */
class NormaliseZettlyTagsCommand extends Command
{
    protected $signature = 'zettly:normalise-tags
        {--dry-run : Report the mapping and the deletions without writing anything}';

    protected $description = 'Map legacy Zettly tags onto the canonical zettelkasten axes and remove the redundant ones';

    /**
     * Legacy name => canonical tag name.
     *
     * A branch or session label is folded into the project it names; a topic
     * becomes an area; a person or account becomes the project they own.
     */
    private array $map = [
        // A literal dash means "no tag was chosen".
        '—' => 'tipe:todo',
        '@journal' => 'tipe:journal',

        // Branch and session labels name a codebase.
        'main' => 'proyek:programinglive',
        'master' => 'proyek:programinglive',
        'fix/devpos-mmch-receipt-20261018' => 'proyek:devpos',
        'codex/google-cloud-portal-20261014' => 'proyek:google-cloud-portal',
        'codex/brain-reading-library-implementation' => 'proyek:brain-reading-library',

        // Topics.
        'dev' => 'area:dev',
        'devpos' => 'proyek:devpos',
        'web' => 'area:web',
        'apps' => 'area:apps',
        'tools' => 'area:tools',
        'server' => 'area:infra',
        'notification' => 'area:notification',
        'mcp' => 'area:mcp',
        'todo' => 'tipe:todo',
        'zettly' => 'area:zettly',
        'zettly-editor' => 'area:zettly',
        'erp' => 'area:erp',
        'hris' => 'area:hris',
        'laravel' => 'area:erp',
        'tutorial' => 'area:tutorial',
        'content' => 'area:content',
        'marketing' => 'area:marketing',
        'license' => 'area:license',
        'image' => 'area:image',
        'github' => 'area:github',
        'project' => 'area:project',
        'ministry' => 'area:ministry',
        'mac' => 'proyek:mac',
        'facebook' => 'area:marketing',
        'linkedin' => 'area:marketing',
        'programinglive' => 'proyek:programinglive',
        'timeless' => 'proyek:timeless-bintaro',
    ];

    private array $axes = ['proyek', 'tipe', 'area', 'sumber'];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $legacy = Tag::query()
            ->orderBy('name')
            ->get()
            ->reject(fn (Tag $tag) => $this->isSchemaTag($tag->name));

        $mapped = 0;
        $unmapped = [];

        foreach ($legacy as $tag) {
            $target = $this->map[$tag->name] ?? null;
            if (! $target) {
                $unmapped[] = $tag->name;
                continue;
            }

            $touched = $this->attachTarget($tag, $target, $dryRun);
            if ($touched > 0) {
                $mapped += $touched;
                $this->line(sprintf(
                    '  %s%s -> %s (%d %s)',
                    $dryRun ? 'would map ' : 'mapped ',
                    $tag->name,
                    $target,
                    $touched,
                    $touched === 1 ? 'record' : 'records',
                ));
            }
        }

        // Deletion is a SECOND pass on purpose: every record has its canonical
        // tag before anything is removed.
        $deleted = 0;
        $kept = [];
        foreach ($legacy as $tag) {
            if (! isset($this->map[$tag->name])) {
                continue;
            }

            /*
             * In a dry run the attachment above did NOT happen, so asking the
             * database "does every record still have a schema tag" would always
             * answer no and the preview would claim every tag is kept. That is
             * misleading. The honest prediction is: every record carrying this
             * legacy tag receives the canonical tag in the real run, so the
             * delete will be allowed. The real run still verifies against the
             * database before touching anything.
             */
            $safe = $dryRun ? $this->canMapEveryRecord($tag) : $this->safeToDelete($tag);
            if (! $safe) {
                $kept[] = $tag->name;
                continue;
            }

            if ($dryRun) {
                $this->line(sprintf('  would delete legacy tag %s', $tag->name));
            } else {
                DB::transaction(function () use ($tag) {
                    DB::table('todo_tag')->where('tag_id', $tag->id)->delete();
                    DB::table('drawing_tag')->where('tag_id', $tag->id)->delete();
                    DB::table('journal_entry_tag')->where('tag_id', $tag->id)->delete();
                    $tag->forceDelete();
                });
                $this->line(sprintf('  deleted legacy tag %s', $tag->name));
            }
            $deleted++;
        }

        $this->newLine();
        if ($unmapped) {
            $this->warn('Left in place (no honest mapping): ' . implode(', ', $unmapped));
        }
        if ($kept) {
            $this->warn('Kept because a record would lose its only tag: ' . implode(', ', $kept));
        }
        $this->info(sprintf(
            '%s: %d record links mapped, %d legacy tags %s, %d kept.',
            $dryRun ? 'DRY RUN' : 'Done',
            $mapped,
            $deleted,
            $dryRun ? 'would be deleted' : 'deleted',
            count($kept) + count($unmapped),
        ));

        return self::SUCCESS;
    }

    private function isSchemaTag(string $name): bool
    {
        foreach ($this->axes as $axis) {
            if (str_starts_with($name, $axis . ':')) {
                return true;
            }
        }

        return false;
    }

    /** Copies the legacy tag's records onto the canonical tag. */
    private function attachTarget(Tag $tag, string $targetName, bool $dryRun): int
    {
        $todoIds = DB::table('todo_tag')->where('tag_id', $tag->id)->pluck('todo_id')->all();
        $drawingIds = DB::table('drawing_tag')->where('tag_id', $tag->id)->pluck('drawing_id')->all();
        $journalIds = DB::table('journal_entry_tag')->where('tag_id', $tag->id)->pluck('journal_entry_id')->all();

        $count = count($todoIds) + count($drawingIds) + count($journalIds);
        if ($count === 0 || $dryRun) {
            return $count;
        }

        $ownerId = $tag->user_id;
        $target = Tag::firstOrCreate(
            ['user_id' => $ownerId, 'name' => $targetName],
            ['color' => '#64748b'],
        );

        $now = now();
        foreach (['todo_tag' => ['todo_id', $todoIds], 'drawing_tag' => ['drawing_id', $drawingIds], 'journal_entry_tag' => ['journal_entry_id', $journalIds]] as $table => $spec) {
            [$column, $ids] = $spec;
            foreach (array_chunk($ids, 500) as $chunk) {
                $rows = array_map(fn ($id) => [
                    $column => $id,
                    'tag_id' => $target->id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $chunk);
                DB::table($table)->insertOrIgnore($rows);
            }
        }

        return $count;
    }

    /**
     * A legacy tag may go only when no record that carried it is left with a
     * schema tag missing. Otherwise removing it would leave that record untagged.
     */
    private function safeToDelete(Tag $tag): bool
    {
        $todoIds = DB::table('todo_tag')->where('tag_id', $tag->id)->pluck('todo_id')->all();
        $drawingIds = DB::table('drawing_tag')->where('tag_id', $tag->id)->pluck('drawing_id')->all();
        $journalIds = DB::table('journal_entry_tag')->where('tag_id', $tag->id)->pluck('journal_entry_id')->all();

        return $this->allHaveSchemaTag('todo_tag', 'todo_id', $todoIds)
            && $this->allHaveSchemaTag('drawing_tag', 'drawing_id', $drawingIds)
            && $this->allHaveSchemaTag('journal_entry_tag', 'journal_entry_id', $journalIds);
    }

    /**
     * Dry-run prediction: will every record carrying this tag be mappable?
     *
     * True when the tag has a canonical target (checked by the caller) and at
     * least the mapping exists. Used only for the preview text; the real run
     * verifies against the database in {@see safeToDelete}.
     */
    private function canMapEveryRecord(Tag $tag): bool
    {
        return isset($this->map[$tag->name]);
    }

    private function allHaveSchemaTag(string $table, string $column, array $recordIds): bool
    {
        if ($recordIds === []) {
            return true;
        }

        foreach (array_chunk($recordIds, 500) as $chunk) {
            $covered = DB::table($table . ' as pivot')
                ->join('tags as t', 't.id', '=', 'pivot.tag_id')
                ->whereIn('pivot.' . $column, $chunk)
                ->where(function ($query) {
                    foreach ($this->axes as $axis) {
                        $query->orWhere('t.name', 'like', $axis . ':%');
                    }
                })
                ->distinct()
                ->pluck('pivot.' . $column)
                ->all();

            if (count(array_unique($covered)) < count(array_unique($chunk))) {
                return false;
            }
        }

        return true;
    }
}
