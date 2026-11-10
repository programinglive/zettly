<?php

return [
    'enabled' => (bool) env('CODING_AGENT_ENABLED', false),
    'owner_user_id' => (int) env('CODING_AGENT_OWNER_USER_ID', 1),
    'owner_email' => env('CODING_AGENT_OWNER_EMAIL', 'mahatma.mahardhika@programinglive.com'),
    'repositories' => json_decode(env('CODING_AGENT_REPOSITORIES', '{"zettly":{"remote":"programinglive/zettly","base":"main"}}'), true) ?: [],
    'models' => json_decode(env('CODING_AGENT_MODELS', '["agnes-3-0-flash:free","gpt-4o-mini:free","agnes-3-0-pro:free","llama-3.3-70b:free"]'), true) ?: ['agnes-3-0-flash:free'],
    'default_model' => env('CODING_AGENT_DEFAULT_MODEL', 'agnes-3-0-flash:free'),
    'github_token' => env('CODING_AGENT_GITHUB_TOKEN', env('GITHUB_TOKEN')),
    'kenari_api_key' => env('CODING_AGENT_KENARI_API_KEY', env('CODING_AGENT_OPENAI_API_KEY', env('OPENAI_API_KEY'))),
    'kenari_base_url' => env('CODING_AGENT_KENARI_BASE_URL', 'https://kenari.id/v1'),
];
