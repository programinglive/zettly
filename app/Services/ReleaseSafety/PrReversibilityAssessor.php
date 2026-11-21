<?php

namespace App\Services\ReleaseSafety;

class PrReversibilityAssessor
{
    public const REVERSIBLE = 'REVERSIBLE';
    public const CONDITIONALLY_REVERSIBLE = 'CONDITIONALLY_REVERSIBLE';
    public const IRREVERSIBLE = 'IRREVERSIBLE';
    public const UNKNOWN = 'UNKNOWN';

    public const RISK_LOW = 'LOW';
    public const RISK_MEDIUM = 'MEDIUM';
    public const RISK_HIGH = 'HIGH';
    public const RISK_CRITICAL = 'CRITICAL';

    /**
     * Evaluate a PR / change set across 8 independent reversibility dimensions and 12 risk detectors.
     *
     * Never marks a PR REVERSIBLE based solely on git revert: requires explicit changed_files
     * and diff evidence. When evidence is missing or ambiguous, dimensions default to UNKNOWN
     * and overall risk is escalated (UNKNOWN is never treated as LOW RISK).
     *
     * @param  array{
     *   repository?: string,
     *   commit_sha?: string|null,
     *   pr_url?: string|null,
     *   previous_release?: string|null,
     *   target_environment?: string|null,
     *   tests_passed?: bool|null,
     *   independent_review_passed?: bool|null,
     *   backup_verified?: bool|null,
     *   changed_files?: array<int, string>|null,
     *   diff_text?: string|null,
     * }  $input
     * @return array<string, mixed>
     */
    public function assess(array $input): array
    {
        $repository = (string) ($input['repository'] ?? 'zettly');
        $commitSha = $input['commit_sha'] ?? null;
        $prUrl = $input['pr_url'] ?? null;
        $previousRelease = (string) ($input['previous_release'] ?? 'v1.5.5');
        $targetEnv = (string) ($input['target_environment'] ?? 'staging');
        $testsPassed = (bool) ($input['tests_passed'] ?? false);
        $reviewPassed = (bool) ($input['independent_review_passed'] ?? false);
        $backupVerified = (bool) ($input['backup_verified'] ?? false);

        $hasFileEvidence = array_key_exists('changed_files', $input)
            && is_array($input['changed_files'])
            && count($input['changed_files']) > 0;
        $changedFiles = $hasFileEvidence
            ? array_values(array_map(static fn ($f): string => str_replace('\\', '/', (string) $f), $input['changed_files']))
            : [];
        $hasDiffEvidence = array_key_exists('diff_text', $input) && is_string($input['diff_text']) && trim($input['diff_text']) !== '';
        $diffText = $hasDiffEvidence ? (string) $input['diff_text'] : '';

        $risks = $this->detectRisks($changedFiles, $diffText, $hasFileEvidence, $hasDiffEvidence);
        $dimensions = $this->evaluateDimensions($changedFiles, $diffText, $risks, $hasFileEvidence, $hasDiffEvidence, $backupVerified);

        $classification = $this->aggregateClassification($dimensions, $hasFileEvidence, $hasDiffEvidence);
        $riskLevel = $this->determineRiskLevel($classification, $risks);
        $gates = $this->evaluateGates($classification, $riskLevel, $risks, $testsPassed, $reviewPassed, $backupVerified);
        $rollbackPlan = $this->buildRollbackPlan($repository, $previousRelease, $commitSha, $targetEnv, $classification, $riskLevel, $risks, $backupVerified);

        return [
            'classification' => $classification,
            'risk_level' => $riskLevel,
            'rollback_status' => $gates['rollback_ready'] ? 'READY' : ($classification === self::IRREVERSIBLE ? 'FORWARD_FIX_ONLY' : 'PREREQUISITES_REQUIRED'),
            'summary' => $this->buildSummary($classification, $riskLevel, $risks, $hasFileEvidence, $hasDiffEvidence),
            'evidence' => [
                'has_file_evidence' => $hasFileEvidence,
                'has_diff_evidence' => $hasDiffEvidence,
                'changed_files_count' => count($changedFiles),
                'changed_files' => array_slice($changedFiles, 0, 50),
                'commit_sha' => $commitSha,
                'pr_url' => $prUrl,
                'tests_passed' => $testsPassed,
                'independent_review_passed' => $reviewPassed,
                'backup_verified' => $backupVerified,
            ],
            'dimensions' => $dimensions,
            'detected_risks' => $risks,
            'gates' => $gates,
            'rollback_plan' => $rollbackPlan,
            'assessed_at' => now()->toIso8601String(),
        ];
    }

    /**
     * @param  array<int, string>  $files
     * @return array<string, array{detected: bool, severity: string, evidence: array<int, string>}>
     */
    private function detectRisks(array $files, string $diff, bool $hasFiles, bool $hasDiff): array
    {
        $matchFiles = static function (string $pattern) use ($files): array {
            return array_values(array_filter($files, static fn (string $f): bool => (bool) preg_match($pattern, $f)));
        };

        $migrationFiles = $matchFiles('#(^|/)database/migrations/.*\.php$#i');

        $destructiveMigrationEvidence = [];
        if ($migrationFiles !== [] && $hasDiff) {
            if (preg_match_all('/\b(dropIfExists|dropColumn|dropForeign|dropPrimary|DROP\s+TABLE|TRUNCATE\s+TABLE)\b/i', $diff, $m)) {
                $destructiveMigrationEvidence = array_values(array_unique($m[0]));
            }
        }

        $dataDeletionEvidence = [];
        if ($hasDiff && preg_match_all('/(\->forceDelete\s*\(|DB::table\([^)]+\)\->delete\s*\(|\bDELETE\s+FROM\b|\bTRUNCATE\b)/i', $diff, $m)) {
            $dataDeletionEvidence = array_values(array_unique($m[0]));
        }

        $columnRenameRemoveEvidence = [];
        if ($hasDiff && preg_match_all('/\b(renameColumn|dropColumn|dropMorphs|CHANGE\s+COLUMN|DROP\s+COLUMN)\b/i', $diff, $m)) {
            $columnRenameRemoveEvidence = array_values(array_unique($m[0]));
        }

        $apiRouteFiles = $matchFiles('#(^|/)routes/api\.php$#i');
        $apiBreakingEvidence = [];
        if ($apiRouteFiles !== [] && $hasDiff && preg_match('/^-\s*Route::(get|post|put|patch|delete|apiResource)\b/m', $diff)) {
            $apiBreakingEvidence[] = 'Removed or altered existing API route declaration in routes/api.php';
        }

        $authFiles = $matchFiles('#(^|/)(app/Http/Controllers/Auth/|app/Http/Requests/Auth/|config/(auth|sanctum|session|fortify)\.php)#i');
        $permFiles = $matchFiles('#(^|/)(app/Http/Middleware/Ensure|app/Policies/|config/coding_agent\.php)#i');
        $infraFiles = $matchFiles('#(^|/)(agent_worker/(bootstrap\.sh|start\.sh|zettly-agent\.service)|docker|nginx|terraform|systemd)#i');
        $deployFiles = $matchFiles('#(^|/)(\.github/workflows/|scripts/release|composer\.json|package\.json)#i');

        $paymentEvidence = [];
        if ($hasDiff && preg_match_all('/\b(stripe|midtrans|xendit|payment_intent|charge|refund|billing_ledger)\b/i', $diff, $m)) {
            $paymentEvidence = array_values(array_unique($m[0]));
        }

        $bgJobFiles = $matchFiles('#(^|/)(app/Jobs/|agent_worker/(agent|executor)\.py)#i');
        $queueFiles = $matchFiles('#(^|/)(config/(queue|broadcasting)\.php|app/Events/)#i');

        $backwardIncompatEvidence = [];
        if ($hasDiff && preg_match('/^-\s*[\'"][A-Z0-9_]+[\'"]\s*=>\s*env\(/m', $diff)) {
            $backwardIncompatEvidence[] = 'Removed or renamed configuration env binding';
        }

        return [
            'destructive_migrations' => [
                'detected' => $destructiveMigrationEvidence !== [],
                'severity' => self::RISK_CRITICAL,
                'evidence' => $destructiveMigrationEvidence,
            ],
            'data_deletion' => [
                'detected' => $dataDeletionEvidence !== [],
                'severity' => self::RISK_CRITICAL,
                'evidence' => $dataDeletionEvidence,
            ],
            'column_renaming_or_removal' => [
                'detected' => $columnRenameRemoveEvidence !== [],
                'severity' => self::RISK_HIGH,
                'evidence' => $columnRenameRemoveEvidence,
            ],
            'api_contract_breaking_changes' => [
                'detected' => $apiBreakingEvidence !== [],
                'severity' => self::RISK_HIGH,
                'evidence' => $apiBreakingEvidence,
            ],
            'authentication_changes' => [
                'detected' => $authFiles !== [],
                'severity' => self::RISK_MEDIUM,
                'evidence' => $authFiles,
            ],
            'permission_changes' => [
                'detected' => $permFiles !== [],
                'severity' => self::RISK_MEDIUM,
                'evidence' => $permFiles,
            ],
            'infrastructure_modifications' => [
                'detected' => $infraFiles !== [],
                'severity' => self::RISK_HIGH,
                'evidence' => $infraFiles,
            ],
            'deployment_configuration_changes' => [
                'detected' => $deployFiles !== [],
                'severity' => self::RISK_MEDIUM,
                'evidence' => $deployFiles,
            ],
            'payment_or_transaction_side_effects' => [
                'detected' => $paymentEvidence !== [],
                'severity' => self::RISK_CRITICAL,
                'evidence' => $paymentEvidence,
            ],
            'background_job_compatibility' => [
                'detected' => $bgJobFiles !== [],
                'severity' => self::RISK_MEDIUM,
                'evidence' => $bgJobFiles,
            ],
            'queue_message_compatibility' => [
                'detected' => $queueFiles !== [],
                'severity' => self::RISK_MEDIUM,
                'evidence' => $queueFiles,
            ],
            'backward_incompatible_application_changes' => [
                'detected' => $backwardIncompatEvidence !== [],
                'severity' => self::RISK_HIGH,
                'evidence' => $backwardIncompatEvidence,
            ],
        ];
    }

    /**
     * @param  array<int, string>  $files
     * @param  array<string, array{detected: bool, severity: string, evidence: array<int, string>}>  $risks
     * @return array<string, array{status: string, risk_level: string, evidence: string, notes: string}>
     */
    private function evaluateDimensions(array $files, string $diff, array $risks, bool $hasFiles, bool $hasDiff, bool $backupVerified): array
    {
        if (! $hasFiles || ! $hasDiff) {
            $unknownDim = [
                'status' => self::UNKNOWN,
                'risk_level' => self::RISK_HIGH,
                'evidence' => 'Missing changed_files or diff_text inspection evidence.',
                'notes' => 'Cannot classify dimension without concrete diff and file list; git revert alone is insufficient.',
            ];

            return [
                'source_code_revert' => $unknownDim,
                'build_artifact_rollback' => $unknownDim,
                'application_deployment_rollback' => $unknownDim,
                'database_schema_compatibility' => $unknownDim,
                'data_recovery' => $unknownDim,
                'external_side_effect_reversibility' => $unknownDim,
                'infrastructure_rollback' => $unknownDim,
                'secrets_configuration_compatibility' => $unknownDim,
            ];
        }

        $hasMigrations = (bool) array_filter($files, static fn (string $f): bool => str_contains($f, 'database/migrations/'));
        $hasDestructiveSchema = $risks['destructive_migrations']['detected'] || $risks['column_renaming_or_removal']['detected'];
        $hasDataDelete = $risks['data_deletion']['detected'];

        // 1. Source code revert
        $sourceRevert = [
            'status' => self::REVERSIBLE,
            'risk_level' => self::RISK_LOW,
            'evidence' => count($files).' tracked files analyzed with full diff.',
            'notes' => 'Source changes are isolated to Git tree and can be reverted via commit/tag checkout.',
        ];

        // 2. Build artifact rollback
        $buildArtifact = [
            'status' => $risks['deployment_configuration_changes']['detected'] ? self::CONDITIONALLY_REVERSIBLE : self::REVERSIBLE,
            'risk_level' => $risks['deployment_configuration_changes']['detected'] ? self::RISK_MEDIUM : self::RISK_LOW,
            'evidence' => $risks['deployment_configuration_changes']['detected']
                ? 'Build/release workflow or dependency manifest modified: '.implode(', ', $risks['deployment_configuration_changes']['evidence'])
                : 'No build toolchain or asset pipeline changes detected.',
            'notes' => 'Prior tagged GitHub Release assets (public/build/**/*) remain immutable on GitHub Releases.',
        ];

        // 3. Application deployment rollback
        $appDeploy = [
            'status' => ($risks['api_contract_breaking_changes']['detected'] || $risks['background_job_compatibility']['detected'])
                ? self::CONDITIONALLY_REVERSIBLE
                : self::REVERSIBLE,
            'risk_level' => $risks['api_contract_breaking_changes']['detected'] ? self::RISK_HIGH : self::RISK_LOW,
            'evidence' => $risks['api_contract_breaking_changes']['detected']
                ? 'API or worker contract modified.'
                : 'Application routes and worker contracts remain backward compatible.',
            'notes' => 'Requires draining active worker leases before switching application release tag.',
        ];

        // 4. Database schema compatibility
        if ($hasDestructiveSchema) {
            $dbSchema = [
                'status' => self::IRREVERSIBLE,
                'risk_level' => self::RISK_CRITICAL,
                'evidence' => 'Destructive schema operation detected: '.implode(', ', array_merge(
                    $risks['destructive_migrations']['evidence'],
                    $risks['column_renaming_or_removal']['evidence']
                )),
                'notes' => 'Previous application release cannot run against a schema with dropped/renamed columns or tables without restoring backup.',
            ];
        } elseif ($hasMigrations) {
            $dbSchema = [
                'status' => self::CONDITIONALLY_REVERSIBLE,
                'risk_level' => self::RISK_MEDIUM,
                'evidence' => 'Additive database migration detected.',
                'notes' => 'Additive nullable/defaulted columns allow previous code release to run, or php artisan migrate:rollback --step=1.',
            ];
        } else {
            $dbSchema = [
                'status' => self::REVERSIBLE,
                'risk_level' => self::RISK_LOW,
                'evidence' => 'Zero database migration files modified.',
                'notes' => 'Full N-1 schema compatibility preserved.',
            ];
        }

        // 5. Data recovery
        if ($hasDataDelete || $hasDestructiveSchema) {
            $dataRecovery = [
                'status' => $backupVerified ? self::CONDITIONALLY_REVERSIBLE : self::IRREVERSIBLE,
                'risk_level' => self::RISK_CRITICAL,
                'evidence' => $backupVerified
                    ? 'Destructive data/schema operation detected, but pre-deployment backup is verified.'
                    : 'Destructive data/schema operation detected WITHOUT verified pre-deployment database backup.',
                'notes' => 'Data deletion cannot be undone by code rollback; requires verified pre-repair dump + sha256.',
            ];
        } else {
            $dataRecovery = [
                'status' => self::REVERSIBLE,
                'risk_level' => self::RISK_LOW,
                'evidence' => 'No destructive data mutations detected.',
                'notes' => 'Existing database records remain intact on application rollback.',
            ];
        }

        // 6. External side-effect reversibility
        if ($risks['payment_or_transaction_side_effects']['detected']) {
            $externalSideEffects = [
                'status' => self::IRREVERSIBLE,
                'risk_level' => self::RISK_CRITICAL,
                'evidence' => 'External payment/billing side-effect tokens detected: '.implode(', ', $risks['payment_or_transaction_side_effects']['evidence']),
                'notes' => 'Third-party financial or webhook dispatches cannot be reversed via deployment rollback.',
            ];
        } else {
            $externalSideEffects = [
                'status' => self::REVERSIBLE,
                'risk_level' => self::RISK_LOW,
                'evidence' => 'No irreversible third-party billing or external mutation side effects detected.',
                'notes' => 'Worker GitHub operations remain confined to draft PRs on isolated agent/job-* branches.',
            ];
        }

        // 7. Infrastructure rollback
        if ($risks['infrastructure_modifications']['detected']) {
            $infraRollback = [
                'status' => self::CONDITIONALLY_REVERSIBLE,
                'risk_level' => self::RISK_HIGH,
                'evidence' => 'Infrastructure/worker bootstrap files modified: '.implode(', ', $risks['infrastructure_modifications']['evidence']),
                'notes' => 'Requires re-syncing previous /opt/zettly-agent release and restarting zettly-agent.service on zettly-coding-agent-1.',
            ];
        } else {
            $infraRollback = [
                'status' => self::REVERSIBLE,
                'risk_level' => self::RISK_LOW,
                'evidence' => 'No VM bootstrap, systemd, or load-balancer files modified.',
                'notes' => 'Infrastructure topology remains unchanged.',
            ];
        }

        // 8. Secrets / configuration compatibility
        $touchesSecretsOrConfig = $risks['backward_incompatible_application_changes']['detected']
            || $risks['authentication_changes']['detected']
            || $risks['permission_changes']['detected'];
        $secretsCompat = [
            'status' => $touchesSecretsOrConfig ? self::CONDITIONALLY_REVERSIBLE : self::REVERSIBLE,
            'risk_level' => $risks['backward_incompatible_application_changes']['detected'] ? self::RISK_HIGH : ($touchesSecretsOrConfig ? self::RISK_MEDIUM : self::RISK_LOW),
            'evidence' => $touchesSecretsOrConfig
                ? 'Auth/permission/config files modified.'
                : 'No secret or breaking environment configuration changes detected.',
            'notes' => 'GCP Secret Manager retains prior secret versions for instant version pin rollback.',
        ];

        return [
            'source_code_revert' => $sourceRevert,
            'build_artifact_rollback' => $buildArtifact,
            'application_deployment_rollback' => $appDeploy,
            'database_schema_compatibility' => $dbSchema,
            'data_recovery' => $dataRecovery,
            'external_side_effect_reversibility' => $externalSideEffects,
            'infrastructure_rollback' => $infraRollback,
            'secrets_configuration_compatibility' => $secretsCompat,
        ];
    }

    /**
     * @param  array<string, array{status: string, risk_level: string, evidence: string, notes: string}>  $dimensions
     */
    private function aggregateClassification(array $dimensions, bool $hasFiles, bool $hasDiff): string
    {
        if (! $hasFiles || ! $hasDiff) {
            return self::UNKNOWN;
        }

        $statuses = array_column($dimensions, 'status');
        if (in_array(self::IRREVERSIBLE, $statuses, true)) {
            return self::IRREVERSIBLE;
        }
        if (in_array(self::UNKNOWN, $statuses, true)) {
            return self::UNKNOWN;
        }
        if (in_array(self::CONDITIONALLY_REVERSIBLE, $statuses, true)) {
            return self::CONDITIONALLY_REVERSIBLE;
        }

        return self::REVERSIBLE;
    }

    /**
     * @param  array<string, array{detected: bool, severity: string, evidence: array<int, string>}>  $risks
     */
    private function determineRiskLevel(string $classification, array $risks): string
    {
        if ($classification === self::IRREVERSIBLE) {
            return self::RISK_CRITICAL;
        }
        // Mandatory rule: UNKNOWN must NEVER silently be treated as LOW RISK.
        if ($classification === self::UNKNOWN) {
            return self::RISK_HIGH;
        }

        foreach ($risks as $risk) {
            if ($risk['detected'] && $risk['severity'] === self::RISK_CRITICAL) {
                return self::RISK_CRITICAL;
            }
        }
        foreach ($risks as $risk) {
            if ($risk['detected'] && $risk['severity'] === self::RISK_HIGH) {
                return self::RISK_HIGH;
            }
        }
        if ($classification === self::CONDITIONALLY_REVERSIBLE) {
            return self::RISK_MEDIUM;
        }
        foreach ($risks as $risk) {
            if ($risk['detected'] && $risk['severity'] === self::RISK_MEDIUM) {
                return self::RISK_MEDIUM;
            }
        }

        return self::RISK_LOW;
    }

    /**
     * @param  array<string, array{detected: bool, severity: string, evidence: array<int, string>}>  $risks
     * @return array<string, mixed>
     */
    private function evaluateGates(
        string $classification,
        string $riskLevel,
        array $risks,
        bool $testsPassed,
        bool $reviewPassed,
        bool $backupVerified
    ): array {
        $blockingConditions = [];

        if (! $testsPassed) {
            $blockingConditions[] = 'Automated CI / test suite has not passed.';
        }
        if (! $reviewPassed) {
            $blockingConditions[] = 'Independent code & security review has not passed.';
        }
        if ($classification === self::UNKNOWN) {
            $blockingConditions[] = 'Reversibility classification is UNKNOWN (missing diff/file evidence); automatic low-risk gate is blocked.';
        }
        if ($classification === self::IRREVERSIBLE && ! $backupVerified) {
            $blockingConditions[] = 'IRREVERSIBLE change detected without verified pre-deployment database backup.';
        }

        $requiredApprovals = ['owner_human_approval'];
        if (in_array($riskLevel, [self::RISK_MEDIUM, self::RISK_HIGH, self::RISK_CRITICAL], true)) {
            $requiredApprovals[] = 'independent_security_code_reviewer';
            $requiredApprovals[] = 'release_manager_signoff';
        }
        if (in_array($riskLevel, [self::RISK_HIGH, self::RISK_CRITICAL], true)) {
            $requiredApprovals[] = 'explicit_high_risk_owner_override';
        }

        return [
            'policy_tier' => $riskLevel,
            'allow_merge_request' => $blockingConditions === [],
            'allow_auto_merge' => false, // Production changes always require human approval
            'rollback_ready' => in_array($classification, [self::REVERSIBLE, self::CONDITIONALLY_REVERSIBLE], true),
            'required_approvals' => $requiredApprovals,
            'blocking_conditions' => $blockingConditions,
        ];
    }

    /**
     * @param  array<string, array{detected: bool, severity: string, evidence: array<int, string>}>  $risks
     * @return array<string, mixed>
     */
    private function buildRollbackPlan(
        string $repository,
        string $previousRelease,
        ?string $commitSha,
        string $targetEnv,
        string $classification,
        string $riskLevel,
        array $risks,
        bool $backupVerified
    ): array {
        $needsDbBackup = $risks['destructive_migrations']['detected']
            || $risks['data_deletion']['detected']
            || $risks['column_renaming_or_removal']['detected'];

        $prerequisites = [
            "Verify target rollback tag {$previousRelease} exists on GitHub Releases with prebuilt public/build assets.",
            'Confirm no active coding-agent worker job holds a running lease during deployment switch.',
        ];
        if ($needsDbBackup) {
            $prerequisites[] = 'Full verified database dump (gzip integrity + sha256 checksum uploaded to gs://bw-server-backups-377312/server_backups_v2/pre-repair/) required before execution.';
        }

        $steps = [
            "1. Pause new job claims or wait for active 120s worker lease on zettly-coding-agent-1 to finish.",
            "2. On application host (bw-app), checkout verified tag {$previousRelease} and restore release public/build assets.",
        ];
        if ($classification === self::CONDITIONALLY_REVERSIBLE) {
            $steps[] = '3. If additive migration was applied, verify N-1 schema compatibility or run php artisan migrate:rollback --step=1 --force.';
        } elseif ($classification === self::IRREVERSIBLE) {
            $steps[] = '3. IRREVERSIBLE schema/data change: prefer forward-fix patch, or restore verified pre-deployment database backup during maintenance window.';
        } else {
            $steps[] = '3. No database rollback required (zero schema mutations).';
        }
        $steps[] = '4. Run php artisan optimize:clear && php artisan config:cache && php artisan route:cache.';
        $steps[] = '5. Verify post-rollback health checks (/up, /login, /api/v1/system/status, worker claim HTTP 204).';

        return [
            'repository' => $repository,
            'previous_known_good_release' => $previousRelease,
            'required_artifact_version' => $previousRelease,
            'evaluated_commit_sha' => $commitSha,
            'target_environment' => $targetEnv,
            'rollback_prerequisites' => $prerequisites,
            'pre_deployment_backup_requirements' => $needsDbBackup
                ? ($backupVerified ? 'Mandatory DB backup REQUIRED and VERIFIED.' : 'Mandatory DB backup REQUIRED (NOT YET VERIFIED — BLOCKER).')
                : 'Standard daily backup sufficient (no destructive schema/data changes in PR).',
            'step_by_step_recovery_procedure' => $steps,
            'data_compatibility_checks' => [
                'Verify sessions, coding_agent_jobs, and todos tables read cleanly under previous release models.',
                'Confirm no orphaned non-nullable columns without defaults block inserts on N-1 code.',
            ],
            'post_rollback_health_checks' => [
                'GET /up returns HTTP 200',
                'GET /login returns HTTP 200 with Cache-Control: no-cache, private',
                'POST /api/v1/coding-agent/claim with worker token returns HTTP 204/200',
            ],
            'estimated_operational_risk' => $riskLevel,
            'human_approval_requirements' => 'Explicit owner approval (mahatma.mahardhika@programinglive.com) required before any production merge, deploy, or rollback execution.',
        ];
    }

    /**
     * @param  array<string, array{detected: bool, severity: string, evidence: array<int, string>}>  $risks
     */
    private function buildSummary(string $classification, string $riskLevel, array $risks, bool $hasFiles, bool $hasDiff): string
    {
        if (! $hasFiles || ! $hasDiff) {
            return 'Classified as UNKNOWN (HIGH RISK): changed files or diff evidence is missing. Never treated as low risk.';
        }

        $activeRisks = array_keys(array_filter($risks, static fn (array $r): bool => $r['detected']));
        if ($activeRisks === []) {
            return "Classified as {$classification} ({$riskLevel} RISK): all 8 reversibility dimensions verified clean with zero destructive risk signals.";
        }

        return "Classified as {$classification} ({$riskLevel} RISK): detected risk signals in [".implode(', ', $activeRisks).'].';
    }
}
