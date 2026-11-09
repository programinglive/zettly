# Zettelkasten tags

Every todo, drawing and journal entry carries at least one tag, and every tag
sits on one of four axes. The point is not decoration: it is to be able to walk
from "everything in this repository" or "everything from Sentry" to the records
themselves, which is what the zettelkasten method is for.

## The four axes

| Axis | Means | Example |
|---|---|---|
| `proyek:` | The codebase or account the work belongs to | `proyek:dev-workflow-mcp-server` |
| `tipe:` | The kind of record, or the task type | `tipe:todo`, `tipe:bugfix`, `tipe:journal` |
| `area:` | The subsystem or topic | `area:monitor`, `area:erp` |
| `sumber:` | Where the record came from | `sumber:manual`, `sumber:sentry` |

A tag is `axis:value`, lowercase, using only `a-z`, `0-9`, `.`, `_` and `-`.
Tags belong to their **owner**: two users may both have `tipe:todo`, and that is
two tags, not a duplicate.

## Where tags are written

- **Create a todo or a drawing** — `POST /api/v1/todos` and
  `POST /api/v1/drawings` accept `tag_ids`, restricted to tags the caller owns.
  The dev-workflow MCP server derives the four axis names and resolves them to
  ids before creating the record.
- **Update a drawing** — `PATCH /api/v1/drawings/{id}` accepts `tag_ids` and
  replaces the drawing's tags.
- **Manually** — the todo and drawing forms let the owner attach and remove tags.

## Where tags are shown

- Todo cards show each tag as a chip that names its axis in front of the value,
  so `proyek dev-workflow-mcp-server` and `area monitor` do not read alike.
- The drawings gallery shows up to four chips per drawing, with a `+N` marker
  when there are more.
- The todo list filter is grouped by axis rather than shown as one flat list.

## Backfill and normalisation

Two commands keep old data in line with the rule.

```bash
# Give every record that has no tag at least one.
php artisan zettly:backfill-tags --dry-run
php artisan zettly:backfill-tags

# Map free-form legacy tags onto the axes, then remove the redundant ones.
php artisan zettly:normalise-tags --dry-run
php artisan zettly:normalise-tags
```

Both are idempotent and support `--dry-run`. Normalisation is deliberately
ordered: every record first receives its canonical tag, and a legacy tag is
deleted only when every record that carried it still holds a tag on an axis.
That is what makes it impossible for the cleanup to leave a record bare.

Legacy names are mapped by meaning, not by spelling: branch and session labels
(`main`, `master`, `codex/...`, `fix/...`) become `proyek:`, topics (`dev`,
`web`, `mcp`, `erp`) become `area:`, `@journal` becomes `tipe:journal`, and a
record tagged with nothing but a literal `—` becomes `tipe:todo`.

## Shipping a change to tag behaviour

A record is tagged by the process that creates it. Two caches therefore matter:

1. **PHP** — reload `php-fpm` after deploying a change to the controllers or the
   commands, otherwise requests keep running the previous code.
2. **The MCP server** — restart it, otherwise it keeps using its previous
   `zettly-tags.js` and new records arrive without tags.

If records appear untagged after a deploy, that is the cause. Run
`zettly:backfill-tags` once more after restarting both.
