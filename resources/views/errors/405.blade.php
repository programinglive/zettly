@include('errors._page', [
    'code' => 405,
    'title' => 'That action is not allowed here',
    'message' => 'This address does not accept the request that was sent. Go back and use the button or form instead of the raw address.',
])
