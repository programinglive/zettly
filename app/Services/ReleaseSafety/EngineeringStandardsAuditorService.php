<?php

namespace App\Services\ReleaseSafety;

class EngineeringStandardsAuditorService
{
    /**
     * Sensitive paths where overlapping changes or merge conflicts must NEVER be auto-resolved.
     *
     * @var array<int, string>
     */
    public const SENSITIVE_CONFLICT_PREFIXES = [
        'app/Http/Middleware/',
        'app/Services/ReleaseSafety/',
        'app/Services/CodingAgentApprovalService.php',
        'app/Support/CodingAgentRoleRegistry.php',
        'database/migrations/',
        'config/auth.php',
        'config/sanctum.php',
        'config/coding_agent.php',
        'engineering/standards/',
        'engineering/policies/',
        '.github/workflows/',
        '.env',
    ];

    /**
     * Audit a change set (changed files + diff text) against the centralized
     * Zettly Engineering Standards Registry (engineering/standards/*.yaml).
     *
     * @param  array<int, string>  $changedFiles
     * @return array{
     *   result: string,
     *   quality_gate: string,
     *   standards_count: int,
     *   summary: array{critical: int, high: int, medium: int, low: int, blocking: int},
     *   findings: array<int, array<string, mixed>>,
     * }
     */
    public function auditChanges(array $changedFiles, string $diffText = '', bool $hasTestCoverage = true): array
    {
        $findings = [];
        $normFiles = array_map(fn ($f) => ltrim(str_replace('\\', '/', (string) $f), '/'), $changedFiles);

        // 1. ZET-SEC-001: Embedded credentials / tokens
        if (preg_match('/(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----)/', $diffText)) {
            $findings[] = [
                'rule_id' => 'ZET-SEC-001',
                'title' => 'No embedded credentials, private keys, or live tokens',
                'severity' => 'critical',
                'enforcement' => 'blocking',
                'file' => $normFiles[0] ?? 'diff',
                'evidence' => 'Embedded secret or token pattern detected in diff.',
            ];
        }

        // 2. ZET-SEC-002: Unsafe shell execution or deserialization in diff
        if (preg_match('/^\+.*\b(?:shell_exec|passthru|unserialize)\s*\(/m', $diffText)) {
            $findings[] = [
                'rule_id' => 'ZET-SEC-002',
                'title' => 'No unrestricted shell execution or unsafe deserialization',
                'severity' => 'high',
                'enforcement' => 'blocking',
                'file' => $normFiles[0] ?? 'diff',
                'evidence' => 'Unsafe shell_exec/passthru/unserialize detected in added diff lines.',
            ];
        }

        // 3. ZET-CODE-002: Unresolved Git conflict markers
        if (preg_match('/^\+?(?:<<<<<<<|=======|>>>>>>>)(?:\s|$)/m', $diffText)) {
            $findings[] = [
                'rule_id' => 'ZET-CODE-002',
                'title' => 'Unresolved Git merge conflict markers',
                'severity' => 'high',
                'enforcement' => 'blocking',
                'file' => $normFiles[0] ?? 'diff',
                'evidence' => 'Merge conflict markers detected in diff.',
            ];
        }

        // 4. ZET-CODE-001: Leftover debug dumps in added lines
        if (preg_match('/^\+\s*(?:dd|var_dump)\s*\(/m', $diffText)) {
            $findings[] = [
                'rule_id' => 'ZET-CODE-001',
                'title' => 'Avoid leftover debug dump statements in production code',
                'severity' => 'medium',
                'enforcement' => 'warning',
                'file' => $normFiles[0] ?? 'diff',
                'evidence' => 'dd() or var_dump() statement detected in added lines.',
            ];
        }

        // 5. ZET-DB-001: Destructive schema migration operations
        foreach ($normFiles as $file) {
            if (str_starts_with($file, 'database/migrations/') && preg_match('/^\+.*\b(?:dropColumn|dropIfExists|dropTable)\s*\(/m', $diffText)) {
                $findings[] = [
                    'rule_id' => 'ZET-DB-001',
                    'title' => 'Destructive schema migration operation requires verified backup and human approval',
                    'severity' => 'critical',
                    'enforcement' => 'blocking',
                    'file' => $file,
                    'evidence' => 'dropColumn / dropIfExists / dropTable detected in migration diff.',
                ];
            }

            // 6. ZET-ARCH-002: Unauthorized modification of protected governance/safety policies
            foreach (AutonomousDeploymentPolicy::PROTECTED_POLICY_PATHS as $protectedPrefix) {
                if ($file === $protectedPrefix || str_starts_with($file, $protectedPrefix)) {
                    $findings[] = [
                        'rule_id' => 'ZET-ARCH-002',
                        'title' => 'Protected release/security policy path cannot be modified autonomously',
                        'severity' => 'critical',
                        'enforcement' => 'blocking',
                        'file' => $file,
                        'evidence' => "Modified protected governance path '{$file}'.",
                    ];
                }
            }
        }

        // 7. ZET-TEST-001: Critical change without regression test coverage
        $hasTestFile = collect($normFiles)->contains(fn ($f) => str_starts_with($f, 'tests/') || str_contains($f, '.test.') || str_contains($f, 'test_'));
        if (! $hasTestCoverage && ! $hasTestFile && $normFiles !== []) {
            $findings[] = [
                'rule_id' => 'ZET-TEST-001',
                'title' => 'Protect critical behavior with regression tests',
                'severity' => 'high',
                'enforcement' => 'conditional',
                'file' => $normFiles[0],
                'evidence' => 'Change set lacks test execution or regression test coverage.',
            ];
        }

        $critical = count(array_filter($findings, fn ($f) => $f['severity'] === 'critical'));
        $high = count(array_filter($findings, fn ($f) => $f['severity'] === 'high'));
        $medium = count(array_filter($findings, fn ($f) => $f['severity'] === 'medium'));
        $low = count(array_filter($findings, fn ($f) => $f['severity'] === 'low'));
        $blocking = count(array_filter($findings, fn ($f) => $f['enforcement'] === 'blocking'));

        $result = $blocking > 0 ? 'FAIL' : ($findings !== [] ? 'WARN' : 'PASS');

        return [
            'result' => $result,
            'quality_gate' => $result === 'FAIL' ? 'FAILED' : ($result === 'WARN' ? 'WARNING' : 'PASSED'),
            'standards_count' => 11,
            'summary' => [
                'critical' => $critical,
                'high' => $high,
                'medium' => $medium,
                'low' => $low,
                'blocking' => $blocking,
            ],
            'findings' => $findings,
        ];
    }

    public function isSensitiveConflictPath(string $path): bool
    {
        $normalized = ltrim(str_replace('\\', '/', $path), '/');
        foreach (self::SENSITIVE_CONFLICT_PREFIXES as $prefix) {
            if ($normalized === $prefix || str_starts_with($normalized, $prefix)) {
                return true;
            }
        }

        return false;
    }
}
