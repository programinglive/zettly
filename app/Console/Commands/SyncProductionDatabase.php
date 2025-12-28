<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SyncProductionDatabase extends Command
{
    protected $signature = 'db:sync-production
                            {--force : Skip confirmation prompt}
                            {--no-drop : Do not drop local database before import}';

    protected $description = 'Sync production database to local environment';

    public function handle()
    {
        // Safety check: only allow in local environment
        if (config('app.env') !== 'local') {
            $this->error('This command can only be run in local environment!');
            return 1;
        }

        // Validate required environment variables
        $requiredVars = [
            'PROD_DB_HOST',
            'PROD_DB_DATABASE',
            'PROD_DB_USERNAME',
            'PROD_DB_PASSWORD',
        ];

        foreach ($requiredVars as $var) {
            if (empty(env($var))) {
                $this->error("Missing required environment variable: {$var}");
                return 1;
            }
        }

        // Confirmation prompt
        if (!$this->option('force')) {
            if (!$this->confirm('This will replace your local database with production data. Continue?')) {
                $this->info('Operation cancelled.');
                return 0;
            }
        }

        $this->info('Starting database sync...');

        try {
            // Step 0: Check for required binaries
            $this->checkBinaries();

            // Step 1: Create dump from production
            $this->info('Creating production database dump...');
            $dumpFile = $this->createProductionDump();

            // Step 2: Drop local database (if not skipped)
            if (!$this->option('no-drop')) {
                $this->info('Dropping local database...');
                $this->dropLocalDatabase();
            }

            // Step 3: Restore dump to local
            $this->info('Restoring database to local...');
            $this->restoreToLocal($dumpFile);

            // Step 4: Clean up
            $this->info('Cleaning up temporary files...');
            if (file_exists($dumpFile)) {
                unlink($dumpFile);
            }

            $this->info('✅ Database sync completed successfully!');
            return 0;

        } catch (\Exception $e) {
            $this->error('Database sync failed: ' . $e->getMessage());
            $this->error('Stack trace: ' . $e->getTraceAsString());
            return 1;
        }
    }

    protected function createProductionDump(): string
    {
        $host = env('PROD_DB_HOST');
        $port = env('PROD_DB_PORT', 5432);
        $database = env('PROD_DB_DATABASE');
        $username = env('PROD_DB_USERNAME');
        $password = env('PROD_DB_PASSWORD');

        $dumpFile = storage_path('app/temp_prod_dump.sql');

        // Create pgpass file for authentication (works on both Windows and Unix)
        $pgpassFile = $this->createPgpassFile($host, $port, $database, $username, $password);

        try {
            $command = sprintf(
                'pg_dump -h %s -p %s -U %s -d %s -F p -f %s --verbose',
                escapeshellarg($host),
                escapeshellarg($port),
                escapeshellarg($username),
                escapeshellarg($database),
                escapeshellarg($dumpFile)
            );

            // Set environment variables, inheriting from current environment to preserve PATH
            $env = array_merge(getenv(), ['PGPASSFILE' => $pgpassFile]);

            $this->info('Connecting to production database...');
            
            $process = proc_open(
                $command,
                [
                    0 => ['pipe', 'r'],
                    1 => ['pipe', 'w'],
                    2 => ['pipe', 'w'],
                ],
                $pipes,
                null,
                $env
            );

            if (!is_resource($process)) {
                throw new \Exception('Failed to start pg_dump process');
            }

            fclose($pipes[0]);

            // Read output in real-time
            stream_set_blocking($pipes[1], false);
            stream_set_blocking($pipes[2], false);

            $stdout = '';
            $stderr = '';
            
            while (true) {
                $status = proc_get_status($process);
                
                // Read stderr for progress info
                $chunk = stream_get_contents($pipes[2]);
                if ($chunk !== false && $chunk !== '') {
                    $stderr .= $chunk;
                    // Show progress messages
                    if (strpos($chunk, 'dumping') !== false) {
                        $this->line('  ' . trim($chunk));
                    }
                }
                
                // Read stdout
                $chunk = stream_get_contents($pipes[1]);
                if ($chunk !== false) {
                    $stdout .= $chunk;
                }
                
                if (!$status['running']) {
                    break;
                }
                
                usleep(100000); // 100ms
            }
            
            fclose($pipes[1]);
            fclose($pipes[2]);

            $returnVar = proc_close($process);

            if ($returnVar !== 0) {
                throw new \Exception('Failed to create production dump: ' . $stderr);
            }

            if (!file_exists($dumpFile)) {
                throw new \Exception('Dump file was not created');
            }

            $fileSize = filesize($dumpFile);
            $this->info('Dump created: ' . number_format($fileSize / 1024 / 1024, 2) . ' MB');

            return $dumpFile;
        } finally {
            // Clean up pgpass file
            if (file_exists($pgpassFile)) {
                unlink($pgpassFile);
            }
        }
    }

    protected function createPgpassFile(string $host, string $port, string $database, string $username, string $password): string
    {
        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        
        if ($isWindows) {
            $pgpassFile = storage_path('app/pgpass.conf');
        } else {
            $pgpassFile = storage_path('app/.pgpass');
        }

        // Format: hostname:port:database:username:password
        $content = sprintf(
            "%s:%s:%s:%s:%s\n",
            $host,
            $port,
            $database,
            $username,
            $password
        );

        file_put_contents($pgpassFile, $content);

        // Set proper permissions on Unix
        if (!$isWindows) {
            chmod($pgpassFile, 0600);
        }

        return $pgpassFile;
    }


    protected function dropLocalDatabase(): void
    {
        $database = config('database.connections.pgsql.database');

        // Connect to 'postgres' database instead of the target database
        $postgresConnection = config('database.default');
        config(['database.connections.pgsql.database' => 'postgres']);
        
        // Reconnect to postgres database
        DB::purge('pgsql');
        DB::reconnect('pgsql');

        try {
            // Terminate existing connections to the target database
            DB::statement("
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = ?
                AND pid <> pg_backend_pid()
            ", [$database]);

            // Drop and recreate database
            DB::statement("DROP DATABASE IF EXISTS " . $database);
            DB::statement("CREATE DATABASE " . $database);
        } finally {
            // Restore original database connection
            config(['database.connections.pgsql.database' => $database]);
            DB::purge('pgsql');
        }
    }

    protected function restoreToLocal(string $dumpFile): void
    {
        $host = config('database.connections.pgsql.host');
        $port = config('database.connections.pgsql.port', 5432);
        $database = config('database.connections.pgsql.database');
        $username = config('database.connections.pgsql.username');
        $password = config('database.connections.pgsql.password');

        // Create pgpass file for authentication
        $pgpassFile = $this->createPgpassFile($host, $port, $database, $username, $password);

        try {
            $this->info('Importing data to local database...');
            
            $command = sprintf(
                'psql -h %s -p %s -U %s -d %s -f %s 2>&1',
                escapeshellarg($host),
                escapeshellarg($port),
                escapeshellarg($username),
                escapeshellarg($database),
                escapeshellarg($dumpFile)
            );

            // Inherit environment to preserve PATH and set PGPASSFILE
            $env = array_merge(getenv(), ['PGPASSFILE' => $pgpassFile]);

            $process = proc_open(
                $command,
                [
                    0 => ['pipe', 'r'],
                    1 => ['pipe', 'w'],
                    2 => ['pipe', 'w'],
                ],
                $pipes,
                null,
                $env
            );

            if (!is_resource($process)) {
                throw new \Exception('Failed to start psql process');
            }

            fclose($pipes[0]);
            $output = stream_get_contents($pipes[1]);
            $errorOutput = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);

            $returnVar = proc_close($process);
            
            // Check if there were actual errors
            if ($returnVar !== 0 || stripos($output . $errorOutput, 'psql: error:') !== false || stripos($output . $errorOutput, 'FATAL:') !== false) {
                throw new \Exception('Failed to restore database: ' . $output . $errorOutput);
            }

            $this->info('✅ Database restored successfully');
        } finally {
            if (file_exists($pgpassFile)) {
                unlink($pgpassFile);
            }
        }
    }

    protected function checkBinaries(): void
    {
        $binaries = ['pg_dump', 'psql'];
        $missing = [];

        foreach ($binaries as $binary) {
            $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
            $checkCommand = $isWindows ? "where $binary" : "which $binary";
            exec($checkCommand, $output, $returnVar);

            if ($returnVar !== 0) {
                $missing[] = $binary;
            }
        }

        if (!empty($missing)) {
            $binaryList = implode(' and ', $missing);
            throw new \Exception(
                "Required binary '$binaryList' not found in system PATH.\n" .
                "Please ensure PostgreSQL client tools are installed and added to your PATH.\n" .
                "Installation help: https://www.postgresql.org/download/"
            );
        }
    }

}
