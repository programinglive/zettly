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
    'dev-workflow-mcp-server' => [
        'name' => 'programinglive/dev-workflow-mcp-server',
        'remote' => 'programinglive/dev-workflow-mcp-server',
        'base' => 'main',
        'stack' => 'Node.js',
        'checks' => 'npm test',
    ],
    'infra-knowledge-mcp-server' => [
        'name' => 'programinglive/infra-knowledge-mcp-server',
        'remote' => 'programinglive/infra-knowledge-mcp-server',
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
    'models' => json_decode(env('CODING_AGENT_MODELS', '["claude-sonnet-5-5","claude-opus-5-5","gpt-6-1-sol","kimi-k2-7-code","qwen3-8-max","deepseek-v4-pro","glm-5-3","gemini-3-8-flash","minimax-m3","north-mini-code:free"]'), true) ?: ['claude-sonnet-5-5'],
    'default_model' => env('CODING_AGENT_DEFAULT_MODEL', 'claude-sonnet-5-5'),
    'github_token' => env('CODING_AGENT_GITHUB_TOKEN', env('GITHUB_TOKEN')),
    'kenari_api_key' => env('CODING_AGENT_KENARI_API_KEY', env('CODING_AGENT_OPENAI_API_KEY', env('OPENAI_API_KEY'))),
    'kenari_base_url' => env('CODING_AGENT_KENARI_BASE_URL', 'https://kenari.id/v1'),
];
