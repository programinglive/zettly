<?php

return [
    'enabled' => (bool) env('CODING_AGENT_ENABLED', false),
    'owner_user_id' => (int) env('CODING_AGENT_OWNER_USER_ID', 1),
    'owner_email' => env('CODING_AGENT_OWNER_EMAIL', 'mahatma.mahardhika@programinglive.com'),
    'repositories' => json_decode(env('CODING_AGENT_REPOSITORIES', '{"zettly":{"remote":"programinglive/zettly","base":"main"}}'), true) ?: [],
];
