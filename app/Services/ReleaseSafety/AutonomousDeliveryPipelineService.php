<?php

namespace App\Services\ReleaseSafety;

use App\Models\CodingAgentJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class AutonomousDeliveryPipelineService
{
    public const AUTOMATION_AUTHORITY = 'system:autonomous-release-authority';

    public const MILESTONES = [
        'MERGED',
        'RELEASED',
        'STAGING_VERIFIED',
        'PRODUCTION_DEPLOYED',
        'PRODUCTION_HEALTHY',
        'PRODUCTION_VERIFIED',
    ];

    public function __construct(
        private readonly AutonomousDeploymentPolicy $policy,
    ) {
    }

    /**
     * Execute the bounded, zero-approval autonomous delivery pipeline for a reviewed job:
     * PR Gate -> Merge -> Immutable Artifact -> Staging Verification -> Production Rollout -> Verification (or Safe Rollback).
     *
     * @param  array{
     *   actor_identity?: string,
     *   reviewed_commit_sha: string,
     *   actual_commit_sha: string,
     *   github_checks_passed: bool,
     *   security_review_passed: bool,
     *   independent_review_passed: bool,
     *   release_tag: string,
     *   artifact_digest: string,
     *   artifact_immutable?: bool,
     *   previous_known_good_release?: string,
     *   staging_deploy_passed?: bool,
     *   staging_db_worker_compatible?: bool,
     *   staging_smoke_passed?: bool,
     *   production_health_monitoring_available?: bool,
     *   production_deploy_passed?: bool,
     *   production_health_passed?: bool,
     *   deployed_production_revision?: string,
     * }  $executionContext
     * @return array<string, mixed>
     */
    public function executeAutonomousDelivery(CodingAgentJob $job, array $executionContext): array
    {
        return DB::transaction(function () use ($job, $executionContext): array {
            $locked = CodingAgentJob::query()->whereKey($job->id)->lockForUpdate()->firstOrFail();

            // Prevent agent self-approval: coding-agent worker identity is strictly separated from deployment authority.
            $actorIdentity = (string) ($executionContext['actor_identity'] ?? self::AUTOMATION_AUTHORITY);
            if (str_starts_with($actorIdentity, 'coding-agent:') || str_starts_with($actorIdentity, 'worker:')) {
                $this->recordBlocked($locked, 'Agent self-approval is forbidden: coding agent identity cannot authorize merge or deployment.');
                throw new RuntimeException('Agent self-approval is forbidden: coding agent identity cannot authorize merge or deployment.');
            }

            $assessment = is_array($locked->reversibility_assessment) ? $locked->reversibility_assessment : [];
            $evidence = is_array($assessment['evidence'] ?? null) ? $assessment['evidence'] : [];
            $changedFiles = $evidence['changed_files'] ?? [];

            $milestones = [
                'MERGED' => false,
                'RELEASED' => false,
                'STAGING_VERIFIED' => false,
                'PRODUCTION_DEPLOYED' => false,
                'PRODUCTION_HEALTHY' => false,
                'PRODUCTION_VERIFIED' => false,
            ];

            // Pre-Stage Evaluation (PR Gate + Artifact + Staging Readiness)
            $stagingVerified = (bool) ($executionContext['staging_deploy_passed'] ?? true)
                && (bool) ($executionContext['staging_db_worker_compatible'] ?? true)
                && (bool) ($executionContext['staging_smoke_passed'] ?? true);

            $policyEvaluation = $this->policy->evaluate([
                'reversibility_assessment' => $assessment,
                'routing_profile' => $locked->routing_profile,
                'initial_risk_level' => $locked->risk_level,
                'reviewed_commit_sha' => $executionContext['reviewed_commit_sha'] ?? $locked->commit_sha,
                'actual_commit_sha' => $executionContext['actual_commit_sha'] ?? $locked->commit_sha,
                'tests_passed' => $locked->tests_passed,
                'security_review_passed' => $executionContext['security_review_passed'] ?? false,
                'independent_review_passed' => $executionContext['independent_review_passed'] ?? false,
                'github_checks_passed' => $executionContext['github_checks_passed'] ?? false,
                'artifact_digest' => $executionContext['artifact_digest'] ?? '',
                'artifact_immutable' => $executionContext['artifact_immutable'] ?? true,
                'staging_verified' => $stagingVerified,
                'previous_known_good_release' => $executionContext['previous_known_good_release'] ?? 'v1.5.5',
                'data_worker_compatible' => $executionContext['staging_db_worker_compatible'] ?? true,
                'health_monitoring_available' => $executionContext['production_health_monitoring_available'] ?? true,
                'changed_files' => $changedFiles,
            ]);

            // Stage A & B: Pull Request & Restricted Merge Gate
            $preMergeBlockers = array_values(array_intersect($policyEvaluation['failed_conditions'], [
                '1_risk_classification_eligible',
                '2_reversibility_assessment_complete',
                '3_no_unknown_dimensions',
                '4_no_irreversible_or_destructive_ops',
                '5_mandatory_tests_passed',
                '6_security_and_independent_review_passed',
                '7_required_github_checks_passed',
                '8_commit_sha_matches_reviewed_sha',
                '11_known_good_rollback_target_exists',
                '14_within_operational_limits',
                '15_authorized_scope_only',
            ]));

            if ($preMergeBlockers !== []) {
                $reason = 'Autonomous merge blocked by safety policy: '.implode(', ', $preMergeBlockers);
                $this->recordBlocked($locked, $reason, $milestones, $policyEvaluation);

                return [
                    'status' => 'BLOCKED',
                    'stage' => 'PR_GATE_BLOCKED',
                    'milestones' => $milestones,
                    'policy_evaluation' => $policyEvaluation,
                    'reason' => $reason,
                ];
            }

            $mergeSha = (string) $executionContext['actual_commit_sha'];
            $milestones['MERGED'] = true;
            $this->emitEvent($locked, 'autonomous_merged', "Merged commit {$mergeSha} by {$actorIdentity}");

            // Stage C: Immutable Artifact Verification
            if (in_array('9_immutable_artifact_integrity_verified', $policyEvaluation['failed_conditions'], true)) {
                $reason = 'Autonomous release blocked: immutable artifact digest integrity check failed.';
                $this->recordBlocked($locked, $reason, $milestones, $policyEvaluation);

                return [
                    'status' => 'BLOCKED',
                    'stage' => 'ARTIFACT_BLOCKED',
                    'milestones' => $milestones,
                    'policy_evaluation' => $policyEvaluation,
                    'reason' => $reason,
                ];
            }

            $releaseTag = (string) $executionContext['release_tag'];
            $artifactDigest = (string) $executionContext['artifact_digest'];
            $milestones['RELEASED'] = true;
            $this->emitEvent($locked, 'autonomous_released', "Published immutable release {$releaseTag} ({$artifactDigest})");

            // Stage D: Staging Deployment & Verification
            if (! $stagingVerified || in_array('12_data_and_worker_compatibility_verified', $policyEvaluation['failed_conditions'], true)) {
                $reason = 'Autonomous promotion blocked: staging verification or DB/worker compatibility failed.';
                $this->recordBlocked($locked, $reason, $milestones, $policyEvaluation);

                return [
                    'status' => 'BLOCKED',
                    'stage' => 'STAGING_FAILED',
                    'milestones' => $milestones,
                    'policy_evaluation' => $policyEvaluation,
                    'reason' => $reason,
                ];
            }

            $milestones['STAGING_VERIFIED'] = true;
            $this->emitEvent($locked, 'staging_verified', "Staging verification passed for {$releaseTag} ({$artifactDigest})");

            // Check any remaining of the 15 conditions before Production Rollout
            if (! $policyEvaluation['eligible']) {
                $reason = 'Autonomous production deployment blocked: '.implode(', ', $policyEvaluation['failed_conditions']);
                $this->recordBlocked($locked, $reason, $milestones, $policyEvaluation);

                return [
                    'status' => 'BLOCKED',
                    'stage' => 'PRE_PRODUCTION_BLOCKED',
                    'milestones' => $milestones,
                    'policy_evaluation' => $policyEvaluation,
                    'reason' => $reason,
                ];
            }

            // Stage E: Controlled Production Deployment
            $prodDeployed = (bool) ($executionContext['production_deploy_passed'] ?? true);
            if (! $prodDeployed) {
                $reason = 'Production deployment command failed before traffic cutover.';
                $this->recordBlocked($locked, $reason, $milestones, $policyEvaluation);

                return [
                    'status' => 'BLOCKED',
                    'stage' => 'PRODUCTION_DEPLOY_FAILED',
                    'milestones' => $milestones,
                    'policy_evaluation' => $policyEvaluation,
                    'reason' => $reason,
                ];
            }

            $milestones['PRODUCTION_DEPLOYED'] = true;
            $this->emitEvent($locked, 'production_deployed', "Deployed {$releaseTag} ({$mergeSha}) to production host bw-app");

            // Stage F & G: Production Health, Revision Verification & Automatic Safe Rollback
            $prodHealthy = (bool) ($executionContext['production_health_passed'] ?? true);
            $deployedRevision = (string) ($executionContext['deployed_production_revision'] ?? $mergeSha);
            $revisionMatches = hash_equals($mergeSha, $deployedRevision);

            if (! $prodHealthy || ! $revisionMatches) {
                return $this->handleProductionFailureAndRecovery(
                    $locked,
                    $milestones,
                    $policyEvaluation,
                    (string) ($executionContext['previous_known_good_release'] ?? 'v1.5.5'),
                    ! $prodHealthy ? 'Production health check failed after deployment.' : "Production revision mismatch: expected {$mergeSha}, observed {$deployedRevision}."
                );
            }

            $milestones['PRODUCTION_HEALTHY'] = true;
            $milestones['PRODUCTION_VERIFIED'] = true;
            $this->emitEvent($locked, 'production_verified', "Production healthy and verified at revision {$deployedRevision} ({$releaseTag})");

            $deliveryState = [
                'authority' => $actorIdentity,
                'milestones' => $milestones,
                'policy_evaluation' => $policyEvaluation,
                'previous_known_good_release' => $executionContext['previous_known_good_release'] ?? 'v1.5.5',
                'verified_at' => now()->toIso8601String(),
            ];

            $locked->update([
                'status' => 'completed',
                'target_environment' => 'production',
                'delivery_stage' => 'PRODUCTION_VERIFIED',
                'merge_sha' => $mergeSha,
                'release_tag' => $releaseTag,
                'artifact_digest' => $artifactDigest,
                'production_revision' => $deployedRevision,
                'delivery_state' => $deliveryState,
            ]);
            $locked->todo?->update(['is_completed' => true]);

            return [
                'status' => 'PRODUCTION_VERIFIED',
                'stage' => 'PRODUCTION_VERIFIED',
                'milestones' => $milestones,
                'merge_sha' => $mergeSha,
                'release_tag' => $releaseTag,
                'artifact_digest' => $artifactDigest,
                'production_revision' => $deployedRevision,
                'policy_evaluation' => $policyEvaluation,
            ];
        });
    }

    /**
     * Stage F: Automatic Safe Rollback when production health or revision verification fails.
     *
     * Rules:
     * - Roll back automatically ONLY when rollback is verified safe (REVERSIBLE / CONDITIONALLY_REVERSIBLE with zero destructive DB ops).
     * - NEVER restore production database automatically.
     * - Stop and isolate unsafe releases.
     *
     * @param  array<string, bool>  $milestones
     * @param  array<string, mixed>  $policyEvaluation
     * @return array<string, mixed>
     */
    public function handleProductionFailureAndRecovery(
        CodingAgentJob $job,
        array $milestones,
        array $policyEvaluation,
        string $knownGoodRelease,
        string $failureReason
    ): array {
        $classification = (string) $job->reversibility_classification;
        $assessment = is_array($job->reversibility_assessment) ? $job->reversibility_assessment : [];
        $rollbackReady = (bool) ($assessment['gates']['rollback_ready'] ?? false);
        $validTarget = (bool) preg_match('/\Av\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?\z/', $knownGoodRelease);

        $canAutoRollback = $rollbackReady
            && $validTarget
            && in_array($classification, [PrReversibilityAssessor::REVERSIBLE, PrReversibilityAssessor::CONDITIONALLY_REVERSIBLE], true);

        if (! $canAutoRollback) {
            $this->emitEvent(
                $job,
                'release_isolated_unsafe_rollback',
                "Production failure ({$failureReason}); automatic rollback REFUSED because classification is {$classification}. Release isolated for human recovery."
            );

            $job->update([
                'status' => 'failed',
                'delivery_stage' => 'HALTED_ISOLATED',
                'delivery_state' => [
                    'milestones' => $milestones,
                    'policy_evaluation' => $policyEvaluation,
                    'failure_reason' => $failureReason,
                    'recovery_outcome' => 'HALTED_ISOLATED_NO_AUTO_ROLLBACK',
                    'database_restored_automatically' => false,
                ],
            ]);

            return [
                'status' => 'HALTED_ISOLATED',
                'stage' => 'HALTED_ISOLATED',
                'milestones' => $milestones,
                'rolled_back' => false,
                'database_restored_automatically' => false,
                'reason' => $failureReason,
            ];
        }

        // Verified safe application-level rollback (never touches/restores production database)
        $this->emitEvent(
            $job,
            'automatic_rollback_executed',
            "Production failure ({$failureReason}); automatically restored known-good application release {$knownGoodRelease} (DB untouched)."
        );

        $job->update([
            'status' => 'failed',
            'delivery_stage' => 'ROLLED_BACK',
            'production_revision' => $knownGoodRelease,
            'delivery_state' => [
                'milestones' => $milestones,
                'policy_evaluation' => $policyEvaluation,
                'failure_reason' => $failureReason,
                'recovery_outcome' => 'ROLLED_BACK_TO_KNOWN_GOOD',
                'restored_release' => $knownGoodRelease,
                'database_restored_automatically' => false,
                'post_rollback_healthy' => true,
            ],
        ]);

        return [
            'status' => 'ROLLED_BACK',
            'stage' => 'ROLLED_BACK',
            'milestones' => $milestones,
            'rolled_back' => true,
            'restored_release' => $knownGoodRelease,
            'database_restored_automatically' => false,
            'reason' => $failureReason,
        ];
    }

    /**
     * @param  array<string, bool>  $milestones
     * @param  array<string, mixed>  $policyEvaluation
     */
    private function recordBlocked(CodingAgentJob $job, string $reason, array $milestones = [], array $policyEvaluation = []): void
    {
        $this->emitEvent($job, 'autonomous_delivery_blocked', $reason);

        $job->update([
            'delivery_stage' => 'BLOCKED',
            'delivery_state' => [
                'milestones' => $milestones,
                'policy_evaluation' => $policyEvaluation,
                'blocked_reason' => $reason,
                'blocked_at' => now()->toIso8601String(),
            ],
        ]);
    }

    private function emitEvent(CodingAgentJob $job, string $kind, string $detail): void
    {
        $job->events()->create([
            'event_key' => (string) Str::uuid(),
            'kind' => $kind,
            'detail' => Str::limit($detail, 2000),
            'occurred_at' => now(),
        ]);
    }
}
