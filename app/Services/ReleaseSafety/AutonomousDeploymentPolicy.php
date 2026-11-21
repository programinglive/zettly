<?php

namespace App\Services\ReleaseSafety;

class AutonomousDeploymentPolicy
{
    /**
     * Safety-critical files and prefixes that autonomous coding agents are NEVER
     * allowed to self-modify or deploy without human authorization.
     *
     * @var array<int, string>
     */
    public const PROTECTED_POLICY_PATHS = [
        'app/Services/ReleaseSafety/',
        'app/Services/CodingAgentApprovalService.php',
        'app/Support/CodingAgentRoleRegistry.php',
        'app/Http/Middleware/EnsureCodingAgentOwner.php',
        'app/Http/Middleware/EnsureCodingAgentWorker.php',
        'app/Http/Middleware/EnsureSuperAdmin.php',
        'config/coding_agent.php',
        '.github/workflows/',
        '.env',
        '.ssh',
        '.aws',
    ];

    /**
     * Evaluate all 15 mandatory conditions for zero-approval autonomous production deployment.
     *
     * If ANY single condition fails, automatic deployment is BLOCKED.
     *
     * @param  array{
     *   reversibility_assessment?: array<string, mixed>|null,
     *   routing_profile?: string|null,
     *   initial_risk_level?: string|null,
     *   reviewed_commit_sha?: string|null,
     *   actual_commit_sha?: string|null,
     *   tests_passed?: bool|null,
     *   security_review_passed?: bool|null,
     *   independent_review_passed?: bool|null,
     *   github_checks_passed?: bool|null,
     *   artifact_digest?: string|null,
     *   artifact_immutable?: bool|null,
     *   staging_verified?: bool|null,
     *   previous_known_good_release?: string|null,
     *   data_worker_compatible?: bool|null,
     *   health_monitoring_available?: bool|null,
     *   within_operational_limits?: bool|null,
     *   changed_files?: array<int, string>|null,
     *   medium_risk_eligible?: bool|null,
     * }  $context
     * @return array{
     *   eligible: bool,
     *   blocked: bool,
     *   effective_risk_level: string,
     *   conditions: array<string, array{passed: bool, detail: string}>,
     *   failed_conditions: array<int, string>,
     *   policy_violations: array<int, string>,
     * }
     */
    public function evaluate(array $context): array
    {
        $assessment = is_array($context['reversibility_assessment'] ?? null)
            ? $context['reversibility_assessment']
            : [];
        $classification = (string) ($assessment['classification'] ?? PrReversibilityAssessor::UNKNOWN);
        $assessedRisk = (string) ($assessment['risk_level'] ?? PrReversibilityAssessor::RISK_HIGH);
        $initialRisk = (string) ($context['initial_risk_level'] ?? $assessedRisk);

        // Rule: No automatic risk downgrade. Effective risk is max(initial, assessed).
        $effectiveRisk = $this->maxRisk($initialRisk, $assessedRisk);

        $dimensions = is_array($assessment['dimensions'] ?? null) ? $assessment['dimensions'] : [];
        $detectedRisks = is_array($assessment['detected_risks'] ?? null) ? $assessment['detected_risks'] : [];
        $evidence = is_array($assessment['evidence'] ?? null) ? $assessment['evidence'] : [];

        $changedFiles = isset($context['changed_files']) && is_array($context['changed_files'])
            ? $context['changed_files']
            : (is_array($evidence['changed_files'] ?? null) ? $evidence['changed_files'] : []);

        $policyViolations = $this->detectProtectedPolicyViolations($changedFiles, $detectedRisks);

        // Condition 1: Risk classification is LOW or explicitly eligible, fully verified MEDIUM risk.
        $mediumEligible = (bool) ($context['medium_risk_eligible'] ?? true)
            && ! ($detectedRisks['destructive_migrations']['detected'] ?? false)
            && ! ($detectedRisks['data_deletion']['detected'] ?? false)
            && ! ($detectedRisks['api_contract_breaking_changes']['detected'] ?? false)
            && ! ($detectedRisks['infrastructure_modifications']['detected'] ?? false);

        $c1 = $effectiveRisk === PrReversibilityAssessor::RISK_LOW
            || ($effectiveRisk === PrReversibilityAssessor::RISK_MEDIUM && $mediumEligible);

        // Condition 2: Reversibility assessment is complete and supported by evidence.
        $c2 = $dimensions !== []
            && count($dimensions) === 8
            && (bool) ($evidence['has_file_evidence'] ?? false)
            && (bool) ($evidence['has_diff_evidence'] ?? false);

        // Condition 3: No material reversibility dimension is UNKNOWN.
        $unknownDims = [];
        foreach ($dimensions as $dimName => $dim) {
            if (($dim['status'] ?? PrReversibilityAssessor::UNKNOWN) === PrReversibilityAssessor::UNKNOWN) {
                $unknownDims[] = $dimName;
            }
        }
        $c3 = $classification !== PrReversibilityAssessor::UNKNOWN && $dimensions !== [] && $unknownDims === [];

        // Condition 4: No irreversible or destructive operation is required.
        $hasDestructive = ($detectedRisks['destructive_migrations']['detected'] ?? false)
            || ($detectedRisks['data_deletion']['detected'] ?? false)
            || ($detectedRisks['column_renaming_or_removal']['detected'] ?? false)
            || ($detectedRisks['payment_or_transaction_side_effects']['detected'] ?? false);
        $c4 = $classification !== PrReversibilityAssessor::IRREVERSIBLE && ! $hasDestructive;

        // Condition 5: All mandatory tests pass.
        $c5 = (bool) ($context['tests_passed'] ?? ($evidence['tests_passed'] ?? false));

        // Condition 6: Security and independent review pass.
        $c6 = (bool) ($context['security_review_passed'] ?? false)
            && (bool) ($context['independent_review_passed'] ?? ($evidence['independent_review_passed'] ?? false));

        // Condition 7: Required GitHub checks pass.
        $c7 = (bool) ($context['github_checks_passed'] ?? false);

        // Condition 8: The actual commit SHA matches the reviewed SHA.
        $reviewedSha = (string) ($context['reviewed_commit_sha'] ?? '');
        $actualSha = (string) ($context['actual_commit_sha'] ?? '');
        $validSha = (bool) preg_match('/\A(?:[0-9a-f]{40}|[0-9a-f]{64})\z/', $actualSha);
        $c8 = $validSha && $reviewedSha !== '' && hash_equals($reviewedSha, $actualSha);

        // Condition 9: Release artifact is immutable and its integrity is verified.
        $digest = (string) ($context['artifact_digest'] ?? '');
        $c9 = (bool) ($context['artifact_immutable'] ?? false)
            && (bool) preg_match('/\Asha256:[0-9a-f]{64}\z/', $digest);

        // Condition 10: Staging verification passes.
        $c10 = (bool) ($context['staging_verified'] ?? false);

        // Condition 11: A known-good rollback target exists.
        $rollbackTarget = (string) ($context['previous_known_good_release']
            ?? ($assessment['rollback_plan']['previous_known_good_release'] ?? ''));
        $c11 = (bool) preg_match('/\Av\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?\z/', $rollbackTarget);

        // Condition 12: Data and worker compatibility are verified.
        $c12 = (bool) ($context['data_worker_compatible'] ?? false);

        // Condition 13: Production health monitoring is available.
        $c13 = (bool) ($context['health_monitoring_available'] ?? false);

        // Condition 14: Deployment occurs within configured operational limits.
        $c14 = (bool) ($context['within_operational_limits'] ?? true)
            && count($changedFiles) > 0
            && count($changedFiles) <= (int) config('coding_agent.autonomous_max_files', 25);

        // Condition 15: The release contains only authorized scope (no forbidden policy/secret/infra mutations).
        $c15 = $policyViolations === [];

        $conditions = [
            '1_risk_classification_eligible' => [
                'passed' => $c1,
                'detail' => "Effective risk is {$effectiveRisk} (initial: {$initialRisk}, assessed: {$assessedRisk}).",
            ],
            '2_reversibility_assessment_complete' => [
                'passed' => $c2,
                'detail' => $c2 ? 'Complete 8-dimension assessment with file and diff evidence.' : 'Missing 8-dimension assessment or file/diff evidence.',
            ],
            '3_no_unknown_dimensions' => [
                'passed' => $c3,
                'detail' => $c3 ? 'Zero UNKNOWN dimensions.' : 'UNKNOWN classification or dimensions: '.implode(', ', $unknownDims ?: ['overall']),
            ],
            '4_no_irreversible_or_destructive_ops' => [
                'passed' => $c4,
                'detail' => $c4 ? 'No destructive schema, data deletion, or irreversible side effects.' : 'Irreversible or destructive operation detected.',
            ],
            '5_mandatory_tests_passed' => [
                'passed' => $c5,
                'detail' => $c5 ? 'All mandatory test suites passed.' : 'Mandatory test suites did not pass.',
            ],
            '6_security_and_independent_review_passed' => [
                'passed' => $c6,
                'detail' => $c6 ? 'Security and independent code review passed.' : 'Security or independent code review failed/missing.',
            ],
            '7_required_github_checks_passed' => [
                'passed' => $c7,
                'detail' => $c7 ? 'Required GitHub checks passed.' : 'Required GitHub checks failed or pending.',
            ],
            '8_commit_sha_matches_reviewed_sha' => [
                'passed' => $c8,
                'detail' => $c8 ? "Verified commit SHA matches reviewed SHA ({$actualSha})." : 'Actual commit SHA does not match reviewed SHA or is invalid.',
            ],
            '9_immutable_artifact_integrity_verified' => [
                'passed' => $c9,
                'detail' => $c9 ? "Immutable artifact digest verified ({$digest})." : 'Artifact digest missing or integrity not verified.',
            ],
            '10_staging_verification_passed' => [
                'passed' => $c10,
                'detail' => $c10 ? 'Staging deployment, compatibility, and smoke tests passed.' : 'Staging verification has not passed.',
            ],
            '11_known_good_rollback_target_exists' => [
                'passed' => $c11,
                'detail' => $c11 ? "Known-good rollback target verified ({$rollbackTarget})." : 'No valid known-good rollback release tag.',
            ],
            '12_data_and_worker_compatibility_verified' => [
                'passed' => $c12,
                'detail' => $c12 ? 'N-1 database schema and active worker compatibility verified.' : 'Database or worker compatibility unverified.',
            ],
            '13_production_health_monitoring_available' => [
                'passed' => $c13,
                'detail' => $c13 ? 'Production health endpoints and monitoring available.' : 'Production health monitoring unavailable.',
            ],
            '14_within_operational_limits' => [
                'passed' => $c14,
                'detail' => $c14 ? 'Change count and operational bounds satisfied.' : 'Exceeds autonomous operational limits.',
            ],
            '15_authorized_scope_only' => [
                'passed' => $c15,
                'detail' => $c15 ? 'All changed files are within bounded autonomous authority.' : 'Forbidden autonomous scope: '.implode('; ', $policyViolations),
            ],
        ];

        $failed = [];
        foreach ($conditions as $key => $cond) {
            if (! $cond['passed']) {
                $failed[] = $key;
            }
        }

        return [
            'eligible' => $failed === [],
            'blocked' => $failed !== [],
            'effective_risk_level' => $effectiveRisk,
            'conditions' => $conditions,
            'failed_conditions' => $failed,
            'policy_violations' => $policyViolations,
        ];
    }

    /**
     * Check whether any changed file violates the Zero-Approval Operational Model boundaries.
     *
     * @param  array<int, string>  $changedFiles
     * @param  array<string, array{detected: bool, severity: string, evidence: array<int, string>}>  $detectedRisks
     * @return array<int, string>
     */
    public function detectProtectedPolicyViolations(array $changedFiles, array $detectedRisks = []): array
    {
        $violations = [];

        foreach ($changedFiles as $file) {
            $normalized = ltrim(str_replace('\\', '/', (string) $file), '/');
            foreach (self::PROTECTED_POLICY_PATHS as $protectedPrefix) {
                if ($normalized === $protectedPrefix || str_starts_with($normalized, $protectedPrefix)) {
                    $violations[] = "Unauthorized modification of protected safety/governance path: {$normalized}";
                }
            }
        }

        if ($detectedRisks['destructive_migrations']['detected'] ?? false) {
            $violations[] = 'Autonomous agents are forbidden from executing destructive schema changes.';
        }
        if ($detectedRisks['data_deletion']['detected'] ?? false) {
            $violations[] = 'Autonomous agents are forbidden from deleting production data.';
        }

        return array_values(array_unique($violations));
    }

    public function maxRisk(string $riskA, string $riskB): string
    {
        $rank = [
            PrReversibilityAssessor::RISK_LOW => 1,
            PrReversibilityAssessor::RISK_MEDIUM => 2,
            PrReversibilityAssessor::RISK_HIGH => 3,
            PrReversibilityAssessor::RISK_CRITICAL => 4,
        ];

        $scoreA = $rank[$riskA] ?? 3;
        $scoreB = $rank[$riskB] ?? 3;

        return $scoreA >= $scoreB ? $riskA : $riskB;
    }
}
