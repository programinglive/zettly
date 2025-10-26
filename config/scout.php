<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default Search Engine
    |--------------------------------------------------------------------------
    |
    | This option controls the default search "driver" that will be used by the
    | framework when searching / indexing information.
    |
    */

    'driver' => env('SCOUT_DRIVER', 'algolia'),

    /*
    |--------------------------------------------------------------------------
    | Algolia Configuration
    |--------------------------------------------------------------------------
    */

    'algolia' => [
        'id' => env('ALGOLIA_APP_ID'),
        'secret' => env('ALGOLIA_ADMIN_KEY'),
        'indices' => [
            'search' => env('ALGOLIA_INDEX_SEARCH', 'zettly_search_local'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Soft Deletes
    |--------------------------------------------------------------------------
    |
    | This option allows you to soft-delete records and indexes them.
    |
    */

    'soft_delete' => false,

    /*
    |--------------------------------------------------------------------------
    | Chunk Size
    |--------------------------------------------------------------------------
    |
    | This option allows you to control the maximum chunk size when indexing.
    |
    */

    'chunk' => [
        'searchable' => 500,
        'unsearchable' => 500,
    ],

    /*
    |--------------------------------------------------------------------------
    | Queue
    |--------------------------------------------------------------------------
    |
    | This option allows you to control if your changes should be queued.
    |
    */

    'queue' => false,
];
