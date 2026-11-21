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
    'ai_triage_enabled' => (bool) env('CODING_AGENT_AI_TRIAGE_ENABLED', false),
    'owner_user_id' => (int) env('CODING_AGENT_OWNER_USER_ID', 1),
    'owner_email' => env('CODING_AGENT_OWNER_EMAIL', 'mahatma.mahardhika@programinglive.com'),
    'repositories' => json_decode(env('CODING_AGENT_REPOSITORIES', ''), true) ?: $defaultRepositories,
    'models' => json_decode(env('CODING_AGENT_MODELS', '["hy4-flash:free","qwen3-5-397b-a17b:free","north-mini-code:free","qwen3-8-27b:free","nemotron-3-ultra-550b-a55b:free","glm-4-7-flash:free","hy4:free","muse-spark-1-3-contributor:free","xing4-0-29b-a4b:free","longcat-2-5:free","solar-mini4:free"]'), true) ?: ['hy4-flash:free'],
    'default_model' => env('CODING_AGENT_DEFAULT_MODEL', 'hy4-flash:free'),
    'max_concurrent_jobs' => (int) env('CODING_AGENT_MAX_CONCURRENT_JOBS', 2),
    'budgets' => [
        'per_job_tokens' => (int) env('CODING_AGENT_BUDGET_PER_JOB_TOKENS', 25000),
        'per_objective_tokens' => (int) env('CODING_AGENT_BUDGET_PER_OBJECTIVE_TOKENS', 100000),
        'daily_tokens' => (int) env('CODING_AGENT_BUDGET_DAILY_TOKENS', 500000),
        'retrospective_tokens' => (int) env('CODING_AGENT_BUDGET_RETROSPECTIVE_TOKENS', 15000),
    ],
    'model_tiers' => [
        'FAST' => [
            'primary' => 'hy4-flash:free',
            'fallback' => 'glm-4-7-flash:free',
        ],
        'CODING' => [
            'primary' => 'hy4-flash:free',
            'fallback' => 'north-mini-code:free',
        ],
        'REASONING' => [
            'primary' => 'qwen3-5-397b-a17b:free',
            'fallback' => 'hy4-flash:free',
        ],
        'REVIEW' => [
            'primary' => 'qwen3-5-397b-a17b:free',
            'fallback' => 'hy4-flash:free',
        ],
    ],
    'github_token' => env('CODING_AGENT_GITHUB_TOKEN', env('GITHUB_TOKEN')),
    'kenari_api_key' => env('CODING_AGENT_KENARI_API_KEY', env('CODING_AGENT_OPENAI_API_KEY', env('OPENAI_API_KEY'))),
    'kenari_base_url' => env('CODING_AGENT_KENARI_BASE_URL', 'https://kenari.id/v1'),
];
