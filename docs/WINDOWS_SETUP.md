# Windows Development Setup

This document outlines the Windows-specific development setup for Zettly.

## PHP Configuration

The `pcntl` extension is disabled in `php.ini` to avoid startup warnings on Windows, as this extension is Unix/Linux only.

## Mail System

- Uses log driver (`MAIL_MAILER=log`) for development
- Emails are logged instead of sent to avoid SMTP configuration during development

## Composer Scripts

- `composer run dev` starts Laravel server, queue worker, and Vite frontend
- Configured for Windows compatibility without Pail logging

## Troubleshooting

If mail job failures occur:
```bash
php artisan queue:clear
php artisan config:clear
```
