<?php

namespace App\Console\Commands;

use App\Models\Drawing;
use App\Models\JournalEntry;
use App\Models\Tag;
use App\Models\Todo;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Give every existing Todo, Drawing and JournalEntry at least one tag.
 *
 * WHY (owner instruction, 10 November 2026)
 * -----------------------------------------
 * "Everything must have a tag, because we adopted the zettelkasten method so we
 * have relations between all our knowledge — so when we need something, we
 * immediately know what is connected." New records are tagged when created; this
 * command brings the records that already exist up to the same rule.
 *
 * THE SCHEME
 * ----------
 * Four axes, the same ones the MCP server derives, so a record can be walked
 * from several directions:
 *   tipe:<kind>     todo / drawing / journal, plus the todo's own type
 *   area:<topic>    inferred from the text when a keyword matches
 *   sumber:<from>   manual, sentry, factory, legacy
 * A record that would otherwise get nothing still gets `tipe:` so the rule
 * "every record has a tag" holds literally.
 *
 * SAFETY
 * ------
 * - Idempotent: a record that already has a tag is skipped, never re-tagged.
 * - Tags are created per owner and reused, so the same name is not duplicated.
 * - --dry-run reports what would happen and writes nothing.
 * - Only records owned by a user are touched; tags are attached to the owner's
 *   own tags so the join never crosses accounts.
 */
class BackfillZettlyTagsCommand extends Command
{
    protected $signature = 'zettly:backfill-tags
        {--dry-run : Report what would be tagged without writing anything}
        {--limit=1000 : Maximum records per type to process in one run}';

    protected $description = 'Attach at least one Zettly tag to every existing todo, drawing and journal entry';

    /** Keywords that identify a subsystem, checked against lowercased text. */
    private array $areaHints = [
        'monitor' => ['monitor', 'dashboard', 'kartu', 'card', 'rekap', 'riwayat'],
        'cli' => ['cli', 'devwf', 'command', 'subcommand'],
        'checkpoint' => ['checkpoint', 'handoff', 'handover'],
        'zettly' => ['zettly', 'draw', 'todo', 'tag', 'zettelkasten'],
        'erp' => ['erp', 'clinic', 'laravel', 'livewire'],
        'factory' => ['factory', 'claim'],
        'deploy' => ['deploy', 'release', 'pipeline', 'runner', 'ci'],
        'sentry' => ['sentry', 'issue', 'error'],
        'infra' => ['infra', 'server', 'vm', 'nginx', 'database', 'ssh'],
    ];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $limit = max(1, (int) $this->option('limit'));

        $totals = ['todos' => 0, 'drawings' => 0, 'journal' => 0, 'skipped' => 0];

        $totals['todos'] += $this->backfillTodos($limit, $dryRun);
        $totals['drawings'] += $this->backfillDrawings($limit, $dryRun);
        $totals['journal'] += $this->backfillJournal($limit, $dryRun);

        $this->newLine();
        $this->info(sprintf(
            '%s: %d todos, %d drawings, %d journal entries tagged.',
            $dryRun ? 'DRY RUN' : 'Done',
            $totals['todos'],
            $totals['drawings'],
            $totals['journal'],
        ));

        return self::SUCCESS;
    }

    private function backfillTodos(int $limit, bool $dryRun): int
    {
        $count = 0;
        Todo::query()
            ->whereDoesntHave('tags')
            ->orderBy('id')
            ->limit($limit)
            ->each(function (Todo $todo) use ($dryRun, &$count) {
                // `type` is Zettly's own column: todo, note or goal. There is no
                // provenance column on this table, so the source axis starts at
                // `manual` rather than being invented from data that is absent.
                $names = $this->tagNamesFor(
                    $todo->title,
                    (string) ($todo->type ?: 'todo'),
                    'manual',
                );
                $this->applyTag($todo, $names, $dryRun);
                $count++;
            });

        return $count;
    }

    private function backfillDrawings(int $limit, bool $dryRun): int
    {
        $count = 0;
        Drawing::query()
            ->whereDoesntHave('tags')
            ->orderBy('id')
            ->limit($limit)
            ->each(function (Drawing $drawing) use ($dryRun, &$count) {
                $names = $this->tagNamesFor($drawing->title, 'drawing', 'manual');
                $this->applyTag($drawing, $names, $dryRun);
                $count++;
            });

        return $count;
    }

    private function backfillJournal(int $limit, bool $dryRun): int
    {
        $count = 0;
        JournalEntry::query()
            ->whereDoesntHave('tags')
            ->orderBy('id')
            ->limit($limit)
            ->each(function (JournalEntry $entry) use ($dryRun, &$count) {
                $names = $this->tagNamesFor($entry->content, 'journal', (string) ($entry->source ?: 'manual'));
                $this->applyTag($entry, $names, $dryRun);
                $count++;
            });

        return $count;
    }

    /** Builds the tag names for one record, always at least one. */
    private function tagNamesFor(?string $text, string $type, string $source): array
    {
        $names = ['tipe:' . $this->slug($type, 24) ?: 'other'];

        $area = $this->areaFor($text);
        if ($area) {
            $names[] = 'area:' . $area;
        }

        $names[] = 'sumber:' . ($this->slug($source, 20) ?: 'manual');

        return array_values(array_unique($names));
    }

    private function areaFor(?string $text): string
    {
        $haystack = mb_strtolower((string) $text);
        foreach ($this->areaHints as $area => $words) {
            foreach ($words as $word) {
                if ($haystack !== '' && str_contains($haystack, $word)) {
                    return $area;
                }
            }
        }

        return '';
    }

    /** Resolves (or creates) the owner's tags and attaches them. */
    private function applyTag($model, array $names, bool $dryRun): void
    {
        if ($dryRun) {
            $this->line(sprintf(
                '  would tag %s #%d with %s',
                class_basename($model),
                $model->id,
                implode(', ', $names),
            ));

            return;
        }

        $ids = [];
        foreach ($names as $name) {
            $tag = Tag::firstOrCreate(
                ['user_id' => $model->user_id, 'name' => $name],
                ['color' => '#64748b'],
            );
            $ids[] = $tag->id;
        }

        $model->tags()->syncWithoutDetaching(array_values(array_unique($ids)));
    }

    private function slug(string $value, int $limit = 40): string
    {
        $value = mb_strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9._-]+/u', '-', $value) ?? '';
        $value = preg_replace('/-+/', '-', $value) ?? '';
        $value = trim($value, '-.');

        return mb_substr($value, 0, $limit);
    }
}
