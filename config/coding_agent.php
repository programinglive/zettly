<?php

$defaultRepositories = [
    'zettly' => [
        'name' => 'programinglive/zettly',
        'remote' => 'programinglive/zettly',
        'base' => 'main',
        'stack' => 'Laravel',
        'checks' => 'php artisan test && npm run test:js',
    ],
    'clinic' => [
        'name' => 'beautyworld_repository/clinic',
        'remote' => 'beautyworld_repository/clinic',
        'base' => 'master',
        'stack' => 'Laravel',
        'checks' => 'vendor/bin/paratest --processes=4 --runner=WrapperRunner',
    ],
    'dev-workflow' => [
        'name' => 'programinglive/dev-workflow',
        'remote' => 'programinglive/dev-workflow',
        'base' => 'main',
        'stack' => 'Node.js',
        'checks' => 'npm test',
    ],
    'central-mcp-gateway' => [
        'name' => 'programinglive/central-mcp-gateway',
        'remote' => 'programinglive/central-mcp-gateway',
        'base' => 'main',
        'stack' => 'Node.js',
        'checks' => 'npm test',
    ],
    'notification-hub' => [
        'name' => 'programinglive/notification-hub',
        'remote' => 'programinglive/notification-hub',
        'base' => 'main',
        'stack' => 'Node.js',
        'checks' => 'npm test',
    ],
];

return [
    'enabled' => (bool) env('CODING_AGENT_ENABLED', false),
    'owner_user_id' => (int) env('CODING_AGENT_OWNER_USER_ID', 1),
    'owner_email' => env('CODING_AGENT_OWNER_EMAIL', 'mahatma.mahardhika@programinglive.com'),
    'repositories' => json_decode(env('CODING_AGENT_REPOSITORIES', ''), true) ?: $defaultRepositories,
    'models' => json_decode(env('CODING_AGENT_MODELS', '["hy4-flash:free","north-mini-code:free","qwen4-max:free","glm-4-7-flash:free","agnes-3-0-flash:free","gpt-4o-mini:free"]'), true) ?: ['hy4-flash:free'],
    'default_model' => env('CODING_AGENT_DEFAULT_MODEL', 'hy4-flash:free'),
    'github_token' => env('CODING_AGENT_GITHUB_TOKEN', env('GITHUB_TOKEN')),
    'kenari_api_key' => env('CODING_AGENT_KENARI_API_KEY', env('CODING_AGENT_OPENAI_API_KEY', env('OPENAI_API_KEY'))),
    'kenari_base_url' => env('CODING_AGENT_KENARI_BASE_URL', 'https://kenari.id/v1'),
];
