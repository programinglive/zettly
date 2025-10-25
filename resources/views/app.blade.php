<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ config('app.name', 'Zettly') }}</title>
        <meta name="description" content="A modern task management application with Kanban board functionality">

        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="vapid-public-key" content="{{ config('app.vapid_public_key') }}">
        
        <!-- Favicon and Icons -->
        <link rel="icon" type="image/x-icon" href="/favicon.ico">
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
        <link rel="manifest" href="/site.webmanifest">
        <meta name="theme-color" content="#3b82f6">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link rel="dns-prefetch" href="https://fonts.bunny.net">
        <link rel="preload" href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" as="style">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @if(app()->environment('local'))
            @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @else
            @vite(['resources/js/app.jsx'])
        @endif
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
