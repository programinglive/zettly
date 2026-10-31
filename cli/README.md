# Zettly CLI

Standalone terminal client for the Zettly web application. Requires Node.js 18 or newer.

## Local use

```sh
npm install --global ./cli
zettly help
node cli/bin/zettly.js help
node cli/bin/zettly.js config set-host https://zettly.programinglive.com
node cli/bin/zettly.js auth login
node cli/bin/zettly.js todos list
node cli/bin/zettly.js todos create --data '{"title":"Prepare release","priority":"urgent","importance":"important"}'
node cli/bin/zettly.js todos list --json
```

`auth register` creates an account and stores a CLI-only Sanctum token on Windows. Existing accounts can use `auth login` for hidden email/password login. Alternatively, set `ZETTLY_API_TOKEN` or pass a PAT with `auth login --token`; exchange a broad PAT for a CLI-only token with `auth issue-token --name zettly-cli`. Tokens are never printed and Windows storage uses the current user's DPAPI key. On other systems, provide `ZETTLY_API_TOKEN` through the operating system's secret store. Tokens are never written to the plain JSON host config.

The default host is `https://zettly.programinglive.com`. `config set-host` changes it. Commands accept `--json`; create/update accept `--data` with JSON or `--file` with a JSON file. Delete and other destructive actions ask for confirmation; `--yes` enables scripts.

## Command examples

```sh
# Existing account: email/password login creates a CLI-only token
zettly auth login
zettly whoami

# Or exchange an existing PAT created in Profile > API Tokens
zettly auth issue-token --name zettly-cli

# New account and password recovery
zettly auth register --name "Your name" --email you@example.com
zettly auth forgot-password --email you@example.com
zettly auth reset-password --email you@example.com
zettly auth send-verification
zettly auth verify-email  # paste the signed URL from the verification email

# Tasks, notes, archive, checklist, tags and links
zettly todos list --filter pending
zettly todos archived --json
zettly todos deleted --json
zettly todos create --title "Ship CLI" --priority urgent --importance important --due-date 2026-11-15
zettly todos complete 42 --reason "Finished in CLI"
zettly todos priority 42 --priority urgent --importance important
zettly todos checklist-toggle 42 7
zettly todos link 42 --related_todo_id 57
zettly notes create --title "Release notes" --description "Draft"
zettly tags create --name release --color '#2563EB'

# Focus, habits and organizations
zettly focus current --json
zettly focus create --title "Write migration"
zettly focus complete 12
zettly habits list --json
zettly habits toggle 4 --count 1
zettly habits stats 4 --start_date 2026-10-01 --end_date 2026-10-31
zettly organizations create --name "Product team"
zettly organizations invite 3 --email teammate@example.com
zettly organizations member-role 3 21 --role admin

# Profile password change prompts without echo
zettly profile password

# Drawings and files
zettly drawings list
zettly drawings export 9 --file ./drawing.json
zettly drawings import --file ./drawing.json
zettly attachments upload 42 --file ./brief.pdf
zettly attachments download 17 --file ./brief.pdf

# Admin and graph tools (server enforces super-admin access)
zettly graph export --file ./zettly-graph.json
zettly graph rebuild
zettly system status --json
zettly system monitor --json
zettly system test-email --recipient me@example.com --subject "CLI check" --message "Delivery check"
```

For destructive non-interactive use, pass `--yes`. Account deletion still prompts for the current password. See [the command implementation](src/cli.js) for aliases and endpoint behavior.

## Command areas

`todos`, `notes`, `tags`, `focus`, `habits`, `organizations`, `drawings`, `attachments`, `graph`, `push`, `profile`, and `system` are the product command areas. `/api/v1` supports todo/note CRUD, completed/archived/deleted views, archive/restore, priority/Eisenhower placement, links, reorder, tags and checklist toggles; focus list/current/detail/create/update/complete/delete; habit list/detail/create/update/delete/toggle/stats; organization list/create/read/update/delete/invite/member role/remove/leave; drawing JSON list/import/export/read/update/delete; attachment list/detail/upload/download/delete; push subscription status/test/unsubscribe; profile read/update/password change/delete and token list/revoke; account registration/password recovery; verification email resend/confirm; graph export and super-admin rebuild; system status and super-admin monitor/email test. CLI tokens carry only the `zettly:cli` ability. Browser notification permission grants and visual canvas editing remain browser workflows.

Drawings are managed as TLDraw document JSON. The CLI does not provide a visual canvas. Browser permission prompts for push notifications also remain browser-only.
