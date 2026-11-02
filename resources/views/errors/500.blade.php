@include('errors._page', [
    'code' => 500,
    'title' => 'Something went wrong on our side',
    'message' => 'The request could not be completed. The failure has been recorded, so there is nothing you need to report. Trying again in a moment usually works.',
])
