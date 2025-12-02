<?php

namespace Tests\Feature\Console\Commands;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;

class SyncProductionDatabaseTest extends TestCase
{
    public function test_command_only_runs_in_local_environment()
    {
        Config::set('app.env', 'production');

        $this->artisan('db:sync-production', ['--force' => true])
            ->expectsOutput('This command can only be run in local environment!')
            ->assertExitCode(1);
    }

    public function test_command_validates_required_environment_variables()
    {
        Config::set('app.env', 'local');
        
        // Clear production database env vars
        putenv('PROD_DB_HOST');
        putenv('PROD_DB_DATABASE');
        putenv('PROD_DB_USERNAME');
        putenv('PROD_DB_PASSWORD');

        $this->artisan('db:sync-production', ['--force' => true])
            ->assertExitCode(1);
    }

    public function test_command_shows_confirmation_prompt_without_force_flag()
    {
        Config::set('app.env', 'local');
        
        // Set required env vars
        putenv('PROD_DB_HOST=test-host');
        putenv('PROD_DB_DATABASE=test-db');
        putenv('PROD_DB_USERNAME=test-user');
        putenv('PROD_DB_PASSWORD=test-pass');

        $this->artisan('db:sync-production')
            ->expectsQuestion('This will replace your local database with production data. Continue?', false)
            ->expectsOutput('Operation cancelled.')
            ->assertExitCode(0);
    }

    public function test_pgpass_file_is_created_correctly()
    {
        $command = new \App\Console\Commands\SyncProductionDatabase();
        
        $reflection = new \ReflectionClass($command);
        $method = $reflection->getMethod('createPgpassFile');
        $method->setAccessible(true);

        $pgpassFile = $method->invoke($command, 'localhost', '5432', 'testdb', 'testuser', 'testpass');

        $this->assertFileExists($pgpassFile);
        
        $content = file_get_contents($pgpassFile);
        $this->assertEquals("localhost:5432:testdb:testuser:testpass\n", $content);

        // Cleanup
        if (file_exists($pgpassFile)) {
            unlink($pgpassFile);
        }
    }

    public function test_pgpass_file_uses_correct_filename_for_windows()
    {
        if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
            $this->markTestSkipped('This test is only for Windows');
        }

        $command = new \App\Console\Commands\SyncProductionDatabase();
        
        $reflection = new \ReflectionClass($command);
        $method = $reflection->getMethod('createPgpassFile');
        $method->setAccessible(true);

        $pgpassFile = $method->invoke($command, 'localhost', '5432', 'testdb', 'testuser', 'testpass');

        $this->assertStringContainsString('pgpass.conf', $pgpassFile);

        // Cleanup
        if (file_exists($pgpassFile)) {
            unlink($pgpassFile);
        }
    }

    public function test_pgpass_file_uses_correct_filename_for_unix()
    {
        $command = new \App\Console\Commands\SyncProductionDatabase();
        
        $reflection = new \ReflectionClass($command);
        $method = $reflection->getMethod('createPgpassFile');
        $method->setAccessible(true);

        $pgpassFile = $method->invoke($command, 'localhost', '5432', 'testdb', 'testuser', 'testpass');

        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        
        if ($isWindows) {
            $this->assertStringContainsString('pgpass.conf', $pgpassFile);
        } else {
            $this->assertStringContainsString('.pgpass', $pgpassFile);
        }

        // Cleanup
        if (file_exists($pgpassFile)) {
            unlink($pgpassFile);
        }
    }
}
