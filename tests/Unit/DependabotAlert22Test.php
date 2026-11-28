<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class DependabotAlert22Test extends TestCase
{
    public function test_locked_php_jwt_is_patched_against_cve_2025_45769(): void
    {
        $lockPath = dirname(__DIR__, 2).'/composer.lock';
        $lock = json_decode((string) file_get_contents($lockPath), true, 512, JSON_THROW_ON_ERROR);

        $versions = [];
        foreach ($lock['packages'] ?? [] as $package) {
            if (($package['name'] ?? '') === 'firebase/php-jwt') {
                $versions[] = ltrim((string) ($package['version'] ?? ''), 'v');
            }
        }

        $this->assertCount(1, $versions, 'composer.lock must pin exactly one firebase/php-jwt package');
        $this->assertTrue(
            version_compare($versions[0], '7.0.0', '>='),
            "firebase/php-jwt {$versions[0]} is vulnerable (CVE-2025-45769); require >= 7.0.0"
        );
    }
}
