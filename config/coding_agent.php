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
    'models' => json_decode(env('CODING_AGENT_MODELS', '["qwen3-5-397b-a17b:free","north-mini-code:free","qwen3-8-27b:free","nemotron-3-ultra-550b-a55b:free","glm-4-7-flash:free","hy4:free","muse-spark-1-3-contributor:free","xing4-0-29b-a4b:free","longcat-2-5:free","solar-mini4:free"]'), true) ?: ['qwen3-5-397b-a17b:free'],
    'default_model' => env('CODING_AGENT_DEFAULT_MODEL', 'qwen3-5-397b-a17b:free'),
    'github_token' => env('CODING_AGENT_GITHUB_TOKEN', env('GITHUB_TOKEN')),
    'kenari_api_key' => env('CODING_AGENT_KENARI_API_KEY', env('CODING_AGENT_OPENAI_API_KEY', env('OPENAI_API_KEY'))),
    'kenari_base_url' => env('CODING_AGENT_KENARI_BASE_URL', 'https://kenari.id/v1'),
];
