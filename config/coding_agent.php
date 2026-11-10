<?php

return [
    'enabled' => (bool) env('CODING_AGENT_ENABLED', false),
    'owner_user_id' => (int) env('CODING_AGENT_OWNER_USER_ID', 0),
    'owner_email' => env('CODING_AGENT_OWNER_EMAIL', ''),
    'repositories' => json_decode(env('CODING_AGENT_REPOSITORIES', '{}'), true) ?: [],
];
