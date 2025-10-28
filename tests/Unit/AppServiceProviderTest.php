<?php

namespace Tests\Unit;

use App\Providers\AppServiceProvider;
use Illuminate\Support\Facades\File;
use ReflectionClass;
use Tests\TestCase;

class AppServiceProviderTest extends TestCase
{
    /** @var string[] */
    private array $createdFiles = [];

    protected function tearDown(): void
    {
        foreach ($this->createdFiles as $file) {
            if (is_file($file)) {
                @unlink($file);
            }
        }

        parent::tearDown();
    }

    public function test_resolve_gcs_key_file_path_returns_configured_path_when_readable(): void
    {
        $path = storage_path('app/test-gcs-key.json');
        $this->createKeyFile($path);

        $resolved = $this->invokeResolveMethod($path);

        $this->assertSame($path, $resolved);
    }

    public function test_resolve_gcs_key_file_path_falls_back_to_storage_app_directory(): void
    {
        $configured = '/unlikely/path/service-account.json';
        $fallback = storage_path('app/service-account.json');
        $this->createKeyFile($fallback);

        $resolved = $this->invokeResolveMethod($configured);

        $this->assertSame($fallback, $resolved);
    }

    private function invokeResolveMethod(string $path): ?string
    {
        $reflection = new ReflectionClass(AppServiceProvider::class);
        $method = $reflection->getMethod('resolveGcsKeyFilePath');
        $method->setAccessible(true);

        return $method->invoke(null, $path);
    }

    private function createKeyFile(string $path): void
    {
        File::ensureDirectoryExists(dirname($path));
        File::put($path, '{}');
        $this->createdFiles[] = $path;
    }
}
