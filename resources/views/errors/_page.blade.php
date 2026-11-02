{{--
    Self-contained error page.

    Deliberately does NOT use @vite or any external stylesheet: a 500/503 is often
    caused by assets being missing or misbuilt (that is exactly what produced the
    "Vite manifest not found" error this app logged), and an error page that needs
    the manifest to render would fail with the very error it is meant to explain.
    Everything here is inline, so it renders from a bare PHP process.

    Included by errors/{403,404,405,419,500,503}.blade.php with $code, $title and
    $message.
--}}
@php
    $code = $code ?? 500;
    $title = $title ?? 'Something went wrong';
    $message = $message ?? 'The request could not be completed. Please try again.';
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="robots" content="noindex, nofollow">
    <title>{{ $code }} · {{ $title }} — {{ config('app.name', 'Zettly') }}</title>
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <style>
        :root {
            color-scheme: light dark;
            --bg: #f8fafc;
            --panel: #ffffff;
            --ink: #0f172a;
            --muted: #64748b;
            --line: #e2e8f0;
            --accent: #2563eb;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg: #0b1120;
                --panel: #111827;
                --ink: #e5e7eb;
                --muted: #94a3b8;
                --line: #1f2937;
                --accent: #60a5fa;
            }
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: var(--bg);
            color: var(--ink);
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            line-height: 1.5;
        }
        main {
            width: 100%;
            max-width: 34rem;
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 16px;
            padding: 40px 32px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, .06);
        }
        .brand {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-weight: 700;
            letter-spacing: -.01em;
            text-decoration: none;
            color: var(--ink);
            margin-bottom: 28px;
        }
        .code {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: .12em;
            text-transform: uppercase;
            color: var(--muted);
        }
        h1 {
            margin: 8px 0 12px;
            font-size: clamp(26px, 5vw, 34px);
            line-height: 1.15;
            letter-spacing: -.02em;
        }
        p { margin: 0 0 28px; color: var(--muted); }
        .actions { display: flex; flex-wrap: wrap; gap: 12px; }
        a.button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 18px;
            border-radius: 10px;
            border: 1px solid var(--line);
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            color: var(--ink);
        }
        a.button.primary {
            background: var(--accent);
            border-color: var(--accent);
            color: #fff;
        }
        a.button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        @media (prefers-color-scheme: dark) { a.button.primary { color: #0b1120; } }
    </style>
</head>
<body>
    <main>
        <a class="brand" href="/">📝 {{ config('app.name', 'Zettly') }}</a>
        <div class="code">Error {{ $code }}</div>
        <h1>{{ $title }}</h1>
        <p>{{ $message }}</p>
        <div class="actions">
            <a class="button primary" href="/">Back to home</a>
            <a class="button" href="/todos">Go to my todos</a>
        </div>
    </main>
</body>
</html>
