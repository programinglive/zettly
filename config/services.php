<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'graph' => [
        // SyncGraphEvent posts to this service on every todo write. When the
        // service is not running, the switch must be reachable so the operator
        // can stop the job instead of letting it throw and retry into
        // failed_jobs. A missing key made GRAPH_SERVICE_ENABLED a no-op.
        'enabled' => (bool) env('GRAPH_SERVICE_ENABLED', true),
        'url' => env('GRAPH_SERVICE_URL', 'http://localhost:3001'),
        'api_url' => env('GRAPH_API_URL'),
        'ws_url' => env('GRAPH_WS_URL'),
    ],

    'github' => [
        'token' => env('CODING_AGENT_GITHUB_TOKEN', env('GITHUB_TOKEN')),
    ],

];
