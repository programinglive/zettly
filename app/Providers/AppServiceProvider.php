<?php

namespace App\Providers;

use App\Models\Tag;
use App\Models\Todo;
use App\Observers\TagObserver;
use App\Observers\TodoObserver;
use Google\Cloud\Storage\StorageClient;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use League\Flysystem\Config as FlysystemConfig;
use League\Flysystem\Filesystem;
use League\Flysystem\GoogleCloudStorage\GoogleCloudStorageAdapter;
use League\Flysystem\UrlGeneration\PublicUrlGenerator;
use Opcodes\LogViewer\Facades\LogViewer;
use Opcodes\LogViewer\Http\Middleware\AuthorizeLogViewer;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register model observers for Algolia indexing
        Todo::observe(TodoObserver::class);
        Tag::observe(TagObserver::class);

        // Add cache fallback for database connection failures
        $this->configureCacheFallback();

        Storage::extend('gcs', function ($app, $config) {
            $clientOptions = [];

            if (! empty($config['project_id'])) {
                $clientOptions['projectId'] = $config['project_id'];
            }

            if (! empty($config['key_file'])) {
                $keyFile = $config['key_file'];

                if (is_string($keyFile)) {
                    $decoded = json_decode($keyFile, true);

                    if (json_last_error() === JSON_ERROR_NONE) {
                        $keyFile = $decoded;
                    }
                }

                if (is_array($keyFile)) {
                    $clientOptions['keyFile'] = $keyFile;
                }
            } elseif (! empty($config['key_file_path'])) {
                $resolvedPath = self::resolveGcsKeyFilePath($config['key_file_path']);

                if ($resolvedPath === null) {
                    throw new \RuntimeException(sprintf(
                        'Google Cloud Storage key file not found. Checked configured path [%s] and common fallbacks. Update GOOGLE_CLOUD_STORAGE_KEY_FILE or place the JSON at storage/app/%s.',
                        $config['key_file_path'],
                        basename($config['key_file_path'])
                    ));
                }

                $clientOptions['keyFilePath'] = $resolvedPath;
            }

            if (! empty($config['api_uri'])) {
                $clientOptions['apiEndpoint'] = $config['api_uri'];
            }

            $storageClient = new StorageClient($clientOptions);
            $bucket = $storageClient->bucket($config['bucket']);

            $adapter = new GoogleCloudStorageAdapter($bucket, $config['root'] ?? '');
            // Do not set default 'visibility' here; with Uniform Bucket-Level Access (UBLA)
            // per-object ACLs are not allowed and will cause 400 errors.
            $filesystem = new Filesystem($adapter);

            $publicUrlGenerator = new class($config) implements PublicUrlGenerator
            {
                public function __construct(private array $diskConfig) {}

                public function publicUrl(string $path, FlysystemConfig $config): string
                {
                    $baseUrl = $this->diskConfig['url']
                        ?? sprintf('https://storage.googleapis.com/%s', $this->diskConfig['bucket']);

                    $root = trim($this->diskConfig['root'] ?? '', '/');
                    $path = ltrim($path, '/');

                    if ($root !== '') {
                        $path = $root.'/'.$path;
                    }

                    return rtrim($baseUrl, '/').'/'.$path;
                }
            };

            return new FilesystemAdapter($filesystem, $adapter, $config, $publicUrlGenerator);
        });

        Inertia::share('appVersion', static function () {
            $package = base_path('package.json');

            if (! is_readable($package)) {
                return null;
            }

            $contents = json_decode((string) file_get_contents($package), true);

            return $contents['version'] ?? null;
        });

        config()->set('log-viewer.middleware', [
            'web',
            'auth',
            AuthorizeLogViewer::class,
        ]);

        LogViewer::auth(static function ($request): bool {
            if (! app()->environment('production')) {
                return $request->user() !== null;
            }

            $user = $request->user();

            return $user !== null
                && strcasecmp($user->email, 'mahatma.mahardhika@programinglive.com') === 0;
        });
    }

    private static function resolveGcsKeyFilePath(string $configuredPath): ?string
    {
        $candidatePaths = [];

        if ($configuredPath !== '') {
            $candidatePaths[] = $configuredPath;

            if (! str_starts_with($configuredPath, '/')) {
                $candidatePaths[] = base_path($configuredPath);
            }
        }

        $candidatePaths[] = storage_path('app/'.basename($configuredPath));

        foreach ($candidatePaths as $path) {
            if ($path && is_readable($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Configure cache fallback for database connection failures.
     * When the database cache driver fails, fall back to array cache.
     */
    private function configureCacheFallback(): void
    {
        // Wrap cache operations to handle database connection failures
        $originalCacheManager = app('cache');

        app()->singleton('cache', function ($app) use ($originalCacheManager) {
            return new class($originalCacheManager) {
                public function __construct(private $originalManager) {}

                public function __call($method, $parameters)
                {
                    try {
                        return $this->originalManager->$method(...$parameters);
                    } catch (\PDOException | \Illuminate\Database\QueryException $e) {
                        // If database cache fails, use array cache as fallback
                        if (str_contains($e->getMessage(), 'FATAL') || str_contains($e->getMessage(), 'connection')) {
                            return $this->originalManager->store('array')->$method(...$parameters);
                        }

                        throw $e;
                    }
                }
            };
        });
    }
}
