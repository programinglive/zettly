<?php

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
