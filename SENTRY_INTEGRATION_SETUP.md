# Sentry Integration Setup Guide

## 🚀 Quick Installation for New Projects

This guide walks you through the Sentry integration workflow that was successfully implemented in the BeautyWorld Clinic project.

---

## 📋 Prerequisites

- Laravel 10+ project
- Composer package manager
- Sentry account (<https://sentry.io>)
- Git repository

---

## 🔧 Step 1: Install Sentry Laravel Package

```bash
composer require sentry/sentry-laravel
```

After installation, publish the configuration file:

```bash
php artisan vendor:publish --provider="Sentry\Laravel\ServiceProvider"
```

---

## 🔑 Step 2: Get Sentry Credentials

1. **Login to Sentry.io** and navigate to your organization.
2. **Create a new project** or select an existing one.
3. **Go to Settings > Client Keys (DSN)**.
4. **Copy your DSN** (starts with `https://`).
5. **Generate an API Token** for issue management:
   - Go to User Settings > API Tokens.
   - Create a new token with scopes: `project:read`, `event:read`, `issue:read`, `issue:write`.
   - Token should start with `sntrys_eyJpYXQiOjE3...`.

---

## ⚙️ Step 3: Configure Environment

Add these variables to your `.env` file:

```env
# Sentry Configuration
SENTRY_LARAVEL_DSN=https://your-dsn-here@sentry.io/project-id
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_TOKEN=sntrys_eyJpYXQiOjE3...
SENTRY_ORG=your-organization
SENTRY_PROJECT=your-project
```

---

## 📦 Step 4: Copy Sentry Commands

Create the following Artisan commands in `app/Console/Commands/`:

### 1. SentryPull.php

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use GuzzleHttp\Client;

class SentryPull extends Command
{
    protected $signature = 'sentry:pull 
        {--limit=25 : Number of issues}
        {--query=is:unresolved : Sentry search query}
        {--sort=freq : freq|new|priority|trend|user}';
    protected $description = 'Fetch Sentry issues and write SENTRY_TODO.md';

    public function handle()
    {
        $token   = env('SENTRY_TOKEN');
        $org     = env('SENTRY_ORG');
        $project = env('SENTRY_PROJECT');
        
        if (!$token || !$org || !$project) {
            $this->error('Set SENTRY_TOKEN, SENTRY_ORG, SENTRY_PROJECT in .env');
            return 1;
        }

        $client = new Client([
            'base_uri' => 'https://sentry.io/api/0/',
            'headers'  => ['Authorization' => "Bearer {$token}"]
        ]);

        $this->info('Fetching issues from Sentry...');
        
        $res = $client->get("projects/{$org}/{$project}/issues/", [
            'query' => [
                'query' => $this->option('query'),
                'limit' => (int) $this->option('limit'),
                'expand' => 'owners,stats',
                'shortIdLookup' => 1,
                'sort' => $this->option('sort'),
            ]
        ]);

        $issues = json_decode($res->getBody()->getContents(), true);
        $blocks = [];

        foreach ($issues as $issue) {
            $issueId  = $issue['id'];
            $shortId  = $issue['shortId'];
            $title    = $issue['title'];
            $culprit  = $issue['culprit'] ?? '';
            $lvl      = $issue['level'] ?? 'error';
            $events   = $issue['count'] ?? '0';
            $users    = $issue['userCount'] ?? '0';
            $first    = $issue['firstSeen'] ?? '';
            $last     = $issue['lastSeen'] ?? '';
            $link     = $issue['permalink'] ?? '';

            $blocks[] = <<<MD
### {$shortId} — {$title}
- Level: **{$lvl}** | Events: **{$events}** | Users: **{$users}**
- Culprit: `{$culprit}` 
- First/Last seen: {$first} → {$last}
- Suggested branch: `fix/{$shortId}` 
- Link: {$link}


MD;
        }

        $content = "# Sentry Fix Queue\n\n> Query: `{$this->option('query')}`, Sort: `{$this->option('sort')}`\n\n" . implode("\n", $blocks);
        file_put_contents(base_path('SENTRY_TODO.md'), $content);
        
        $this->info('Wrote SENTRY_TODO.md');
        $this->info('Found ' . count($issues) . ' issues to fix');
        
        return 0;
    }
}
```

### 2. SentryDebug.php

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SentryDebug extends Command
{
    protected $signature = 'sentry:debug';
    protected $description = 'Test Sentry configuration';

    public function handle()
    {
        $this->info('Testing Sentry configuration...');
        
        $token = env('SENTRY_TOKEN');
        $org = env('SENTRY_ORG');
        $project = env('SENTRY_PROJECT');
        
        $this->info('Token: ' . ($token ? substr($token, 0, 20) . '...' : 'NOT SET'));
        $this->info('Org: ' . ($org ?? 'NOT SET'));
        $this->info('Project: ' . ($project ?? 'NOT SET'));
        
        if ($token && $org && $project) {
            $this->info('✅ Configuration looks good!');
        } else {
            $this->error('❌ Missing configuration');
            return 1;
        }
        
        return 0;
    }
}
```

### 3. SentryTestToken.php

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use GuzzleHttp\Client;

class SentryTestToken extends Command
{
    protected $signature = 'sentry:test-token {token}';
    protected $description = 'Test a specific Sentry token';

    public function handle()
    {
        $token = $this->argument('token');
        
        $this->info('Testing Sentry token...');
        $this->info('Token: ' . substr($token, 0, 20) . '...');
        
        $client = new Client([
            'base_uri' => 'https://sentry.io/api/0/',
            'headers'  => ['Authorization' => "Bearer {$token}"]
        ]);
        
        try {
            $res = $client->get('auth/');
            $auth = json_decode($res->getBody()->getContents(), true);
            
            $this->info('✅ Token is valid');
            $this->info('  User: ' . ($auth['user']['email'] ?? 'Unknown'));
            $this->info('  Scopes: ' . implode(', ', $auth['scopes'] ?? []));
            
            $requiredScopes = ['project:read', 'event:read'];
            $hasRequired = !array_diff($requiredScopes, $auth['scopes'] ?? []);
            
            if (!$hasRequired) {
                $this->error('❌ Missing required scopes');
            } else {
                $this->info('✅ Token has required scopes');
            }
        } catch (\Exception $e) {
            $this->error('❌ Invalid token: ' . $e->getMessage());
            return 1;
        }
        
        return 0;
    }
}
```

### 4. SentryResolve.php

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use GuzzleHttp\Client;

class SentryResolve extends Command
{
    protected $signature = 'sentry:resolve {identifier* : One or more Sentry issue identifiers (e.g., POS-CLINIC-P)}';
    protected $description = 'Resolve Sentry issues via the Sentry API';

    public function __construct(private ?Client $client = null)
    {
        parent::__construct();
    }

    public function handle()
    {
        $token   = env('SENTRY_TOKEN');
        $org     = env('SENTRY_ORG');
        $project = env('SENTRY_PROJECT');

        if (!$token || !$org || !$project) {
            $this->error('Set SENTRY_TOKEN, SENTRY_ORG, and SENTRY_PROJECT in the environment.');
            return 1;
        }

        $client = $this->client ?? new Client([
            'base_uri' => 'https://sentry.io/api/0/',
            'headers'  => ['Authorization' => "Bearer {$token}"],
        ]);

        foreach ($this->argument('identifier') as $identifier) {
            $this->info("Resolving issue {$identifier}...");

            try {
                $lookupResponse = $client->get("projects/{$org}/{$project}/issues/", [
                    'query' => [
                        'query' => $identifier,
                        'limit' => 1,
                        'shortIdLookup' => 1,
                    ],
                ]);

                $matchedIssues = json_decode($lookupResponse->getBody()->getContents(), true);

                if (empty($matchedIssues)) {
                    $this->warn("No matching issue found for identifier {$identifier}.");
                    continue;
                }

                $issueId = $this->resolveIssueId($matchedIssues[0]);

                if ($issueId === null) {
                    $this->error("Failed to determine numeric issue ID for {$identifier}.");
                    continue;
                }

                $client->request('PUT', "issues/{$issueId}/", [
                    'json' => ['status' => 'resolved'],
                ]);

                $this->info("Resolved issue {$identifier} (ID {$issueId}).");
            } catch (\Throwable $e) {
                $this->error("Failed to resolve {$identifier}: {$e->getMessage()}");
            }
        }

        $this->info('Done resolving issues.');
        return 0;
    }

    private function resolveIssueId(array $issue): ?string
    {
        $rawIssueId = $issue['id'] ?? null;

        if ($rawIssueId !== null) {
            $rawIssueId = (string) $rawIssueId;

            if ($rawIssueId !== '' && ctype_digit($rawIssueId)) {
                return $rawIssueId;
            }
        }

        if (!empty($issue['permalink'])) {
            $path = parse_url($issue['permalink'], PHP_URL_PATH);

            if (is_string($path)) {
                $segments = array_values(array_filter(explode('/', trim($path, '/'))));
                $maybeIssueId = end($segments) ?: false;

                if ($maybeIssueId && ctype_digit($maybeIssueId)) {
                    return $maybeIssueId;
                }
            }
        }

        return null;
    }
}
```

### 5. SentryToken.php (Alias)

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SentryToken extends Command
{
    protected $signature = 'sentry:token {token?}';
    protected $description = 'Alias for sentry:test-token command';

    public function handle()
    {
        $this->info('This command has been renamed to "sentry:test-token"');
        $this->info('Please use: php artisan sentry:test-token <token>');
        
        if ($token = $this->argument('token')) {
            return $this->call('sentry:test-token', ['token' => $token]);
        }
        
        return 0;
    }
}
```

---

## 🚀 Step 5: Register Commands

Add the commands to `app/Console/Kernel.php`:

```php
protected $commands = [
    // ... your existing commands
    Commands\SentryPull::class,
    Commands\SentryDebug::class,
    Commands\SentryTestToken::class,
    Commands\SentryResolve::class,
    Commands\SentryToken::class,
];
```

Or, if using auto-loading (recommended), ensure the commands directory is loaded:

```php
protected function commands(): void
{
    $this->load(__DIR__.'/Commands');
    require base_path('routes/console.php');
}
```

---

## 🌍 Step 6: Install Sentry CLI (Optional but Recommended)

### Windows

```bash
# Using Scoop
scoop bucket add main
scoop install sentry-cli

# Or download directly
iwr https://sentry.io/get-cli/ -o sentry-cli.exe
.\sentry-cli.exe --version
```

### Mac/Linux

```bash
brew install sentry-cli
# or
curl -sL https://sentry.io/get-cli/ | bash
```

After installation, login to Sentry:

```bash
sentry-cli login
```

---

## 🔄 Step 7: Workflow Integration

### Daily/Maintenance Workflow

```bash
# 1. Pull latest issues from Sentry
php artisan sentry:pull --limit=10 --sort=freq

# 2. Read SENTRY_TODO.md to prioritize fixes
# 3. Fix the issues
# 4. Commit and push fixes
# 5. Mark issues as resolved in Sentry
sentry-cli issues resolve --id=<issue_id>

# Or bulk resolve (after fixing):
for id in $(grep "Link:" SENTRY_TODO.md | grep -o "[0-9]*$"); do
    sentry-cli issues resolve --id=$id
done
```

### Git Hooks Integration

Add to `.husky/pre-commit`:

```bash
# Check for Sentry TODO
if [ -f "SENTRY_TODO.md" ]; then
    if grep -q "Found [1-9]" SENTRY_TODO.md; then
        echo "⚠️  You have unresolved Sentry issues in SENTRY_TODO.md"
        echo "   Please review and fix them before committing"
    fi
fi
```

---

## 🧪 Step 8: Testing the Integration

Test your setup:

```bash
# Test configuration
php artisan sentry:debug

# Test token (replace with your token)
php artisan sentry:test-token sntrys_eyJpYXQiOjE3...

# Pull issues
php artisan sentry:pull --limit=5
```

---

## 📚 Additional Tips

### Environment-Specific Settings

```env
# .env.local (development)
SENTRY_TRACES_SAMPLE_RATE=0.1

# .env.production
SENTRY_TRACES_SAMPLE_RATE=1.0
```

### Performance Monitoring

```php
// In app/Http/Kernel.php - Middleware Groups
'web' => [
    // ... other middleware
    \Sentry\Laravel\Integration\HttpCaptureUnhandledRequests::class,
],

'api' => [
    // ... other middleware
    \Sentry\Laravel\Integration\HttpCaptureUnhandledRequests::class,
],
```

### Custom Error Reporting

```php
// In your controllers/services
use Sentry\State\Scope;

Sentry\configureScope(function (Scope $scope): void {
    $scope->setUser(['email' => user()->email]);
    $scope->setTag('page', 'checkout');
});
```

---

## 🎯 Success Checklist

- [ ] Sentry Laravel package installed
- [ ] DSN configured in .env
- [ ] API token with correct scopes
- [ ] Sentry commands copied and registered
- [ ] Sentry CLI installed (optional)
- [ ] Test commands working
- [ ] First issue pulled successfully
- [ ] Git hooks configured (optional)

---

## 🆘 Troubleshooting

If you encounter issues:

1. **403 Forbidden**: Check token scopes and organization access.
2. **No issues found**: Verify organization/project names.
3. **Command not found**: Ensure commands are registered in `Kernel.php`.
4. **Authentication errors**: Double-check DSN and token format.

For detailed troubleshooting, see [`SENTRY_TROUBLESHOOTING.md`](SENTRY_TROUBLESHOOTING.md).

---

## 📈 Benefits

This Sentry integration provides:

- **Automatic error tracking** for production issues.
- **Centralized issue management** with Sentry TODO file.
- **Workflow automation** for fixing bugs.
- **Performance monitoring** capabilities.
- **Production visibility** without code changes.

Your project now has the same robust error handling workflow as the BeautyWorld Clinic project! 🎉
