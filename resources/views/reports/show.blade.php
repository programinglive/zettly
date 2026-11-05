<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>{{ __('Activity report') }} · {{ config('app.name') }}</title>
    <style>
        body { max-width: 56rem; margin: 2rem auto; padding: 0 1rem; font: 1rem/1.6 system-ui, sans-serif; color: #18181b; }
        pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; }
        a { color: #1d4ed8; }
    </style>
</head>
<body>
    <a href="{{ route('dashboard') }}">{{ __('Open Dashboard') }}</a>
    <h1>{{ __('Activity report') }}</h1>
    <p>{{ $report->period_start->toDateString() }} – {{ $report->period_end->toDateString() }}</p>
    <pre>{{ $content }}</pre>
</body>
</html>
