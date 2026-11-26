<?php

/**
 * @zettly-code ZC-ZETTLY-CONSOLE-SCHED-001
 *
 * @purpose Register scheduled background Artisan commands including 5-minute Sentry P0 auto-preemption for erp.beautyworld.co.id.
 */
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Journal reports: daily at 23:55 WIB, delivery attempts every 15 minutes.
// The host must run `php artisan schedule:run` every minute and keep
// `php artisan queue:work` running for the delivery jobs to execute.
Schedule::command('journal:generate-reports')->dailyAt('23:55')->timezone('Asia/Jakarta');
Schedule::command('journal:deliver-reports')->everyFifteenMinutes();
Schedule::command('zettly:engineering-sync')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('zettly:sentry-p0-sync')->everyFiveMinutes()->withoutOverlapping();
// Todo #1100: poll npm Support ticket #5040981 and leave feedback on the Todo every 6 hours.
Schedule::command('zettly:verify-legacy-npm')->everySixHours()->withoutOverlapping();

// Zettly V1.7 Engineering Intelligence Retrospectives (Asia/Jakarta)
Schedule::command('engineering:retrospective daily')->dailyAt('00:10')->timezone('Asia/Jakarta')->withoutOverlapping();
Schedule::command('engineering:retrospective weekly')->weeklyOn(1, '08:00')->timezone('Asia/Jakarta')->withoutOverlapping();
Schedule::command('engineering:retrospective monthly')->monthlyOn(1, '09:00')->timezone('Asia/Jakarta')->withoutOverlapping();
