@php
    $appName = config('app.name', 'Zettly');
@endphp

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject ?? 'Test Email' }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background-color: #f9fafb;
            color: #111827;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #4f46e5, #6366f1);
            padding: 32px 30px;
            color: #ffffff;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
            line-height: 1.6;
        }
        .content p {
            margin: 0 0 16px;
            font-size: 16px;
        }
        .footer {
            padding: 24px 30px;
            background-color: #f3f4f6;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
        blockquote {
            margin: 0;
            padding: 18px 22px;
            background-color: #eef2ff;
            border-left: 4px solid #4f46e5;
            border-radius: 8px;
            color: #312e81;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ $appName }} Test Email</h1>
        </div>
        <div class="content">
            <p>Hello{{ $senderName ? ' from ' . $senderName : '' }},</p>
            <p>You've successfully triggered the test email flow. This message shows exactly how your configured mail driver renders outbound mail.</p>
            <blockquote>
                {!! nl2br(e($body)) !!}
            </blockquote>
            <p class="mt-4">
                You can edit <code>resources/views/emails/test.blade.php</code> if you need to customize the layout while testing.
            </p>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} {{ $appName }}. All rights reserved.
        </div>
    </div>
</body>
</html>
