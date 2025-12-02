# Database Sync Command

## Overview

The `db:sync-production` command allows you to sync your production database to your local development environment.

## Prerequisites

1. **PostgreSQL tools installed**: Ensure `pg_dump` and `psql` are available in your PATH
2. **Production database access**: You need credentials to access the production database
3. **Local environment**: This command can only run in `local` environment for safety

## Configuration

Add the following environment variables to your `.env` file:

```env
# Production Database Sync
PROD_DB_HOST=your-production-host.com
PROD_DB_PORT=5432
PROD_DB_DATABASE=your_production_database
PROD_DB_USERNAME=your_production_user
PROD_DB_PASSWORD=your_production_password
```

## Usage

### Basic Usage

```bash
php artisan db:sync-production
```

This will:
1. Prompt for confirmation
2. Create a dump from the production database
3. Drop your local database
4. Restore the production dump to local
5. Clean up temporary files

### Skip Confirmation

```bash
php artisan db:sync-production --force
```

### Keep Local Data (No Drop)

```bash
php artisan db:sync-production --no-drop
```

This will import production data without dropping the local database first. **Warning**: This may cause conflicts if tables already exist.

## Safety Features

- **Environment check**: Only runs in `local` environment
- **Confirmation prompt**: Asks for confirmation before destructive operations
- **Validation**: Checks for required environment variables before starting
- **Error handling**: Provides clear error messages if something goes wrong

## Troubleshooting

### "pg_dump: command not found"

Install PostgreSQL client tools:
- **Windows**: Install PostgreSQL and add to PATH
- **Mac**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql-client`

### "Failed to create production dump"

- Verify production database credentials in `.env`
- Check network connectivity to production server
- Ensure production database user has dump permissions

### "Failed to restore database"

- Verify local database credentials
- Ensure local PostgreSQL server is running
- Check disk space for the dump file

### Command appears stuck during restore

The restore process uses `shell_exec()` which doesn't show real-time output. For a 4-5 MB database, it typically takes 10-30 seconds. The command will complete and show "✅ Database restored successfully" when done.

## Example Workflow

```bash
# 1. Configure production credentials
echo "PROD_DB_HOST=prod.example.com" >> .env
echo "PROD_DB_DATABASE=zettly_prod" >> .env
# ... add other credentials

# 2. Run the sync
php artisan db:sync-production

# 3. Verify the data
php artisan tinker
>>> \App\Models\User::count()
```

## Technical Details

### Authentication

The command uses PostgreSQL's `pgpass` file for authentication:
- **Windows**: Creates `storage/app/pgpass.conf`
- **Unix/Linux**: Creates `storage/app/.pgpass` with 0600 permissions

The file is automatically created and cleaned up after each run.

### Process

1. **Dump**: Uses `pg_dump` with `--verbose` flag to create a plain SQL dump
2. **Drop**: Connects to `postgres` database to drop and recreate the target database
3. **Restore**: Uses `psql` to execute the SQL dump file
4. **Cleanup**: Removes temporary dump file and pgpass file

## Security Notes

- Never commit production credentials to version control
- Use environment variables for all sensitive data
- The pgpass file is automatically cleaned up after use
- Consider using SSH tunneling for additional security
- Regularly rotate production database passwords
