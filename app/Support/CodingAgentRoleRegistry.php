<?php

namespace App\Support;

use InvalidArgumentException;

class CodingAgentRoleRegistry
{
    public const STATUS_READY = 'READY';
    public const STATUS_PARTIALLY_READY = 'PARTIALLY_READY';
    public const STATUS_BLOCKED = 'BLOCKED';
    public const STATUS_NOT_IMPLEMENTED = 'NOT_IMPLEMENTED';

    public const PROFILE_FAST = 'FAST';
    public const PROFILE_STANDARD = 'STANDARD';
    public const PROFILE_FULL = 'FULL';
    public const PROFILE_PARALLEL_FULL = 'PARALLEL_FULL';

    public const TIER_FAST = 'FAST';
    public const TIER_CODING = 'CODING';
    public const TIER_REASONING = 'REASONING';
    public const TIER_REVIEW = 'REVIEW';

    /**
     * Resolve the optimal Kenari primary and fallback model for a role & risk level
     * using task-aware model tiers (FAST, CODING, REASONING, REVIEW).
     *
     * @return array{tier: string, primary_model: string, fallback_model: string, token_budget: int}
     */
    public static function selectModelPolicyForRole(string $role, string $riskLevel = 'LOW'): array
    {
        $profile = self::getOrFail($role);
        $rawTier = strtolower((string) ($profile['model_policy']['tier'] ?? 'coding'));

        $tier = match (true) {
            in_array($rawTier, ['research', 'fast'], true) && $riskLevel === 'LOW' => self::TIER_FAST,
            in_array($rawTier, ['planning', 'architecture'], true) || in_array($riskLevel, ['HIGH', 'CRITICAL'], true) => self::TIER_REASONING,
            in_array($rawTier, ['review', 'verification', 'release_safety'], true) => self::TIER_REVIEW,
            default => self::TIER_CODING,
        };

        $tiersConfig = config('coding_agent.model_tiers', []);
        $tierSpec = is_array($tiersConfig[$tier] ?? null) ? $tiersConfig[$tier] : [];

        return [
            'tier' => $tier,
            'primary_model' => (string) ($tierSpec['primary'] ?? $profile['model_policy']['default_model'] ?? 'hy4-flash:free'),
            'fallback_model' => (string) ($tierSpec['fallback'] ?? $profile['model_policy']['fallback'] ?? 'qwen3-5-397b-a17b:free'),
            'token_budget' => (int) config('coding_agent.budgets.per_job_tokens', 25000),
        ];
    }

    /**
     * Return all 12 logical AI Engineering Organization role profiles.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function all(): array
    {
        $configured = config('coding_agent.roles', []);
        if (is_array($configured) && $configured !== []) {
            return array_replace_recursive(self::defaultRoles(), $configured);
        }

        return self::defaultRoles();
    }

    /**
     * Return the 6 Minimum Viable Team (MVT / FULL profile) ordered pipeline roles.
     *
     * @return array<int, string>
     */
    public static function mvtPipelineOrder(): array
    {
        return self::rolesForRoutingProfile(self::PROFILE_FULL);
    }

    /**
     * Return the ordered role pipeline for a given Adaptive Role Routing profile.
     *
     * Profile 1 — FAST (Low Risk): Developer -> Release Manager
     * Profile 2 — STANDARD (Normal Feature / Bug Fix): Developer -> QA Engineer -> Security & Code Reviewer -> Release Manager
     * Profile 3 — FULL (Medium / High Risk): AI CTO -> Software Architect -> Developer -> QA Engineer -> Security & Code Reviewer -> Release Manager
     *
     * @return array<int, string>
     */
    public static function rolesForRoutingProfile(string $profile): array
    {
        $normalized = strtoupper(trim($profile));

        return match ($normalized) {
            self::PROFILE_FAST => [
                'developer',
                'release_manager',
            ],
            self::PROFILE_STANDARD => [
                'developer',
                'qa_engineer',
                'security_code_reviewer',
                'release_manager',
            ],
            self::PROFILE_FULL => [
                'ai_cto',
                'software_architect',
                'developer',
                'qa_engineer',
                'security_code_reviewer',
                'release_manager',
            ],
            default => throw new InvalidArgumentException("Unsupported role routing profile: {$profile}"),
        };
    }

    /**
     * Find a single role profile by slug (resolving legacy/specialized aliases).
     *
     * @return array<string, mixed>|null
     */
    public static function find(string $role): ?array
    {
        $all = self::all();
        if (isset($all[$role])) {
            return $all[$role];
        }

        if ($role === 'independent_code_reviewer') {
            return $all['security_code_reviewer'] ?? null;
        }

        return null;
    }

    /**
     * Require a valid role profile or throw InvalidArgumentException.
     *
     * @return array<string, mixed>
     */
    public static function getOrFail(string $role): array
    {
        $profile = self::find($role);
        if (! $profile) {
            throw new InvalidArgumentException("Unknown AI engineering role: {$role}");
        }

        return $profile;
    }

    /**
     * Enforce role permissions in code (not prompt-only).
     *
     * @param  array<string, mixed>  $context
     */
    public static function assertPermission(string $role, string $permission, array $context = []): void
    {
        $profile = self::getOrFail($role);

        if (($profile['readiness_status'] ?? '') === self::STATUS_BLOCKED) {
            throw new InvalidArgumentException("Role '{$role}' is currently BLOCKED from autonomous execution.");
        }

        $permissions = $profile['permissions'] ?? [];
        $allowed = $permissions[$permission] ?? false;

        if ($allowed === false || $allowed === null) {
            throw new InvalidArgumentException("Role '{$role}' is not permitted to perform '{$permission}'.");
        }

        if ($permission === 'repository_write' && $allowed === 'scoped' && isset($context['changed_files']) && is_array($context['changed_files'])) {
            $disallowedPrefixes = $profile['disallowed_path_prefixes'] ?? ['.env', '.github/workflows/'];
            foreach ($context['changed_files'] as $file) {
                $normalized = ltrim(str_replace('\\', '/', (string) $file), '/');
                foreach ($disallowedPrefixes as $prefix) {
                    if (str_starts_with($normalized, $prefix)) {
                        throw new InvalidArgumentException("Role '{$role}' attempted to modify protected path '{$normalized}'.");
                    }
                }
            }
        }
    }

    /**
     * Default 12-role engineering organization catalog.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function defaultRoles(): array
    {
        $defaultModel = config('coding_agent.default_model', 'hy4-flash:free');

        return [
            'ai_cto' => [
                'role' => 'ai_cto',
                'title' => 'AI CTO / Orchestrator',
                'description' => 'Analyze engineering objectives, decompose tasks into a dependency graph, and assign specialized roles.',
                'mvt_member' => true,
                'readiness_status' => self::STATUS_READY,
                'execution_mode' => 'read_only',
                'model_policy' => [
                    'tier' => 'planning',
                    'provider' => 'kenari',
                    'default_model' => $defaultModel,
                    'fallback' => 'qwen3-5-397b-a17b:free',
                ],
                'permissions' => [
                    'repository_read' => true,
                    'repository_write' => false,
                    'create_branch' => false,
                    'create_pull_request' => false,
                    'merge_pull_request' => false,
                    'production_deploy' => false,
                ],
                'execution' => [
                    'isolated_workspace' => 'required',
                    'concurrency_limit' => 1,
                    'max_runtime_seconds' => 600,
                ],
                'quality_requirements' => [
                    'tests_required' => false,
                    'lint_required' => false,
                    'typecheck_required' => 'not_applicable',
                    'independent_review' => 'required',
                ],
                'contract' => [
                    'required_inputs' => ['objective', 'repository'],
                    'required_outputs' => ['objective_analysis', 'task_breakdown'],
                ],
                'handoff' => [
                    'next_role' => 'software_architect',
                ],
            ],

            'principal_engineer' => [
                'role' => 'principal_engineer',
                'title' => 'Principal Engineer',
                'description' => 'Cross-repository technical governance, ADR adjudication, and high-risk refactoring review.',
                'mvt_member' => false,
                'readiness_status' => self::STATUS_PARTIALLY_READY,
                'execution_mode' => 'read_only',
                'model_policy' => [
                    'tier' => 'architecture',
                    'provider' => 'kenari',
                    'default_model' => $defaultModel,
                    'fallback' => 'qwen3-5-397b-a17b:free',
                ],
                'permissions' => [
                    'repository_read' => true,
                    'repository_write' => false,
                    'create_branch' => false,
                    'create_pull_request' => false,
                    'merge_pull_request' => false,
                    'production_deploy' => false,
                ],
                'execution' => [
                    'isolated_workspace' => 'required',
                    'concurrency_limit' => 1,
                    'max_runtime_seconds' => 600,
                ],
                'quality_requirements' => [
                    'tests_required' => false,
                    'lint_required' => false,
                    'typecheck_required' => 'not_applicable',
                    'independent_review' => 'required',
                ],
                'contract' => [
                    'required_inputs' => ['objective_analysis'],
                    'required_outputs' => ['adr_decision', 'risk_constraints'],
                ],
                'handoff' => [
                    'next_role' => 'software_architect',
                ],
            ],

            'software_architect' => [
                'role' => 'software_architect',
                'title' => 'Software Architect',
                'description' => 'Produce concrete component design, file-level implementation plan, and backward-compatibility constraints.',
                'mvt_member' => true,
                'readiness_status' => self::STATUS_READY,
                'execution_mode' => 'read_only',
                'model_policy' => [
                    'tier' => 'architecture',
                    'provider' => 'kenari',
                    'default_model' => $defaultModel,
                    'fallback' => 'qwen3-5-397b-a17b:free',
                ],
                'permissions' => [
                    'repository_read' => true,
                    'repository_write' => false,
                    'create_branch' => false,
                    'create_pull_request' => false,
                    'merge_pull_request' => false,
                    'production_deploy' => false,
                ],
                'execution' => [
                    'isolated_workspace' => 'required',
                    'concurrency_limit' => 1,
                    'max_runtime_seconds' => 600,
                ],
                'quality_requirements' => [
                    'tests_required' => false,
                    'lint_required' => false,
                    'typecheck_required' => 'not_applicable',
                    'independent_review' => 'required',
                ],
                'contract' => [
                    'required_inputs' => ['objective_analysis', 'task_breakdown'],
                    'required_outputs' => ['architecture_plan', 'target_files'],
                ],
                'handoff' => [
                    'next_role' => 'developer',
                ],
            ],

            'developer' => [
                'role' => 'developer',
                'title' => 'Developer (Full-Stack Implementation)',
                'description' => 'Implement scoped code and unit tests in an isolated Git worktree and open a draft pull request.',
                'mvt_member' => true,
                'readiness_status' => self::STATUS_READY,
                'execution_mode' => 'code_write',
                'model_policy' => [
                    'tier' => 'coding',
                    'provider' => 'kenari',
                    'default_model' => $defaultModel,
                    'fallback' => 'north-mini-code:free',
                ],
                'permissions' => [
                    'repository_read' => true,
                    'repository_write' => 'scoped',
                    'create_branch' => true,
                    'create_pull_request' => true,
                    'merge_pull_request' => false,
                    'production_deploy' => false,
                ],
                'disallowed_path_prefixes' => ['.env', '.ssh', '.aws'],
                'execution' => [
                    'isolated_workspace' => 'required',
                    'concurrency_limit' => 1,
                    'max_runtime_seconds' => 1800,
                ],
                'quality_requirements' => [
                    'tests_required' => true,
                    'lint_required' => true,
                    'typecheck_required' => 'when_applicable',
                    'independent_review' => 'required',
                ],
                'contract' => [
                    'required_inputs' => ['architecture_plan'],
                    'required_outputs' => ['branch', 'commit_sha', 'changed_files', 'diff_text'],
                ],
                'handoff' => [
                    'next_role' => 'qa_engineer',
                ],
            ],

            'backend_engineer' => [
                'role' => 'backend_engineer',
                'title' => 'Backend Engineer',
                'description' => 'Implement backend services, controllers, API endpoints, and PHPUnit/Python tests.',
                'mvt_member' => false,
                'readiness_status' => self::STATUS_READY,
                'execution_mode' => 'code_write',
                'model_policy' => [
                    'tier' => 'coding',
                    'provider' => 'kenari',
                    'default_model' => $defaultModel,
                    'fallback' => 'north-mini-code:free',
                ],
                'permissions' => [
                    'repository_read' => true,
                    'repository_write' => 'scoped',
                    'create_branch' => true,
                    'create_pull_request' => true,
                    'merge_pull_request' => false,
                    'production_deploy' => false,
                ],
                'disallowed_path_prefixes' => ['.env', '.github/workflows/'],
                'execution' => [
                    'isolated_workspace' => 'required',
                    'concurrency_limit' => 1,
                    'max_runtime_seconds' => 1800,
                ],
                'quality_requirements' => [
                    'tests_required' => true,
                    'lint_required' => true,
                    'typecheck_required' => 'when_applicable',
                    'independent_review' => 'required',
                ],
                'contract' => [
                    'required_inputs' => ['architecture_plan'],
                    'required_outputs' => ['branch', 'commit_sha', 'changed_files', 'diff_text'],
                ],
                'handoff' => [
                    'next_role' => 'qa_engineer',
                ],
            ],

            'frontend_engineer' => [
                'role' => 'frontend_engineer',
                'title' => 'Frontend Engineer',
                'description' => 'Implement Inertia React components, Tailwind styling, and frontend tests.',
                'mvt_member' => false,
                'readiness_status' => self::STATUS_READY,
                'execution_mode' => 'code_write',
                'model_policy' => [
                    'tier' => 'coding',
                    'provider' => 'kenari',
                    'default_model' => $defaultModel,
                    'fallback' => 'north-mini-code:free',
                ],
                'permissions' => [
                    'repository_read' => true,
                    'repository_write' => 'scoped',
                    'create_branch' => true,
                    'create_pull_request' => true,
                    'merge_pull_request' => false,
                    'production_deploy' => false,
                ],
                'disallowed_path_prefixes' => ['.env', 'database/migrations/', '.github/workflows/'],
                'execution' => [
                    'isolated_workspace' => 'required',
                    'concurrency_limit' => 1,
                    'max_runtime_seconds' => 1800,
                ],
                'quality_requirements' => [
                    'tests_required' => true,
                    'lint_required' => true,
                    'typecheck_required' => 'when_applicable',
                    'independent_review' => 'required',
                ],
                'contract' => [
                    'required_inputs' => ['architecture_plan'],
                    'required_outputs' => ['branch', 'commit_sha', 'changed_files', 'diff_text'],
                ],
                'handoff' => [
                    'next_role' => 'qa_engineer',
                ],
            ],

            'database_engineer' => [
                'role' => 'database_engineer',
                'title' => 'Database Engineer',
                'description' => 'Design additive N-1 compatible schema migrations and verify pre-migration backup constraints.',
                'mvt_member' => false,
                'readiness_status' => self::STATUS_PARTIALLY_READY,
                'execution_mode' => 'code_write',
                'model_policy' => [
                    'tier' => 'coding',
                    'provider' => 'kenari',
                    'default_model' => $defaultModel,
                    'fallback' => 'qwen3-5-397b-a17b:free',
                ],
                'permissions' => [
                    'repository_read' => true,
                    'repository_write' => 'scoped',
                    'create_branch' => true,
                    'create_pull_request' => true,
                    'merge_pull_request' => false,
                    'production_deploy' => false,
                ],
                'disallowed_path_prefixes' => ['.env', '.github/workflows/'],
                'execution' => [
                    'isolated_workspace' => 'required',
                    'concurrency_limit' => 1,
                    'max_runtime_seconds' => 1200,
                ],
                'quality_requirements' => [
                    'tests_required' => true,
                    'lint_required' => true,
                    'typecheck_required' => 'not_applicable',
                    'independent_review' => 'required',
                ],
                'contract' => [
                    'required_inputs' => ['architecture_plan'],
                    'required_outputs' => ['migration_files', 'rollback_compatibility_proof'],
                ],
                'handoff' => [
                    'next_role' => 'qa_engineer',
                ],
            ],

            'devops_sre_engineer' => [
                'role' => 'devops_sre_engineer',
                'title' => 'DevOps / SRE Engineer',
                'description' => 'Evaluate CI/CD pipelines, systemd services, and GCP infrastructure reliability.',
                'mvt_member' => false,
                'readiness_status' => self::STATUS_BLOCKED,
                'execution_mode' => 'read_only',
                'model_policy' => [
                    'tier' => 'operations',
                    'provider' => 'kenari',
                    'default_model' => $defaultModel,
                    'fallback' => 'qwen3-5-397b-a17b:free',
                ],
                'permissions' => [
                    'repository_read' => true,
                    'repository_write' => false,
                    'create_branch' => false,
                    'create_pull_request' => false,
                    'merge_pull_request' => false,
                    'production_deploy' => false,
                ],
                'execution' => [
                    'isolated_workspace' => 'required',
                    'concurrency_limit' => 1,
                    'max_runtime_seconds' => 600,
                ],
                'quality_requirements' => [
                    'tests_required' => true,
                    'lint_required' => true,
                    'typecheck_required' => 'not_applicable',
                    'independent_review' => 'required',
                ],
                'contract' => [
                    'required_inputs' => ['infrastructure_scope'],
                    'required_outputs' => ['sre_runbook'],
                ],
                'handoff' => [
                    'next_role' => 'security_code_reviewer',
                ],
            ],

            'qa_engineer' => [
                'role' => 'qa_engineer',
                'title' => 'QA Engineer',
                'description' => 'Execute automated test suites, verify acceptance criteria, and block defective changes.',
                'mvt_member' => true,
                'readiness_status' => self::STATUS_READY,
                'execution_mode' => 'read_only',
                'model_policy' => [
                    'tier' => 'verification',
                    'provider' => 'kenari',
                    'default_model' => $defaultModel,
                    'fallback' => 'qwen3-5-397b-a17b:free',
                ],
                'permissions' => [
                    'repository_read' => true,
                    'repository_write' => false,
                    'create_branch' => false,
                    'create_pull_request' => false,
                    'merge_pull_request' => false,
                    'production_deploy' => false,
                ],
                'execution' => [
                    'isolated_workspace' => 'required',
                    'concurrency_limit' => 1,
                    'max_runtime_seconds' => 900,
                ],
                'quality_requirements' => [
                    'tests_required' => true,
                    'lint_required' => true,
                    'typecheck_required' => 'when_applicable',
                    'independent_review' => 'required',
                ],
                'contract' => [
                    'required_inputs' => ['branch', 'commit_sha', 'changed_files'],
                    'required_outputs' => ['qa_verdict', 'test_summary', 'tests_passed'],
                ],
                'handoff' => [
                    'next_role' => 'security_code_reviewer',
                ],
            ],

            'security_code_reviewer' => [
                'role' => 'security_code_reviewer',
                'title' => 'Security & Independent Code Reviewer',
                'description' => 'Perform independent code quality, OWASP/auth/secret-leakage, and permission boundary review.',
                'mvt_member' => true,
                'readiness_status' => self::STATUS_READY,
                'execution_mode' => 'review',
                'model_policy' => [
                    'tier' => 'review',
                    'provider' => 'kenari',
                    'default_model' => $defaultModel,
                    'fallback' => 'qwen3-5-397b-a17b:free',
                ],
                'permissions' => [
                    'repository_read' => true,
                    'repository_write' => false,
                    'create_branch' => false,
                    'create_pull_request' => false,
                    'merge_pull_request' => false,
                    'production_deploy' => false,
                ],
                'execution' => [
                    'isolated_workspace' => 'required',
                    'concurrency_limit' => 1,
                    'max_runtime_seconds' => 600,
                ],
                'quality_requirements' => [
                    'tests_required' => true,
                    'lint_required' => true,
                    'typecheck_required' => 'when_applicable',
                    'independent_review' => 'required',
                ],
                'contract' => [
                    'required_inputs' => ['commit_sha', 'changed_files', 'diff_text', 'qa_verdict'],
                    'required_outputs' => ['security_verdict', 'review_verdict', 'findings'],
                ],
                'handoff' => [
                    'next_role' => 'release_manager',
                ],
            ],

            'release_manager' => [
                'role' => 'release_manager',
                'title' => 'Release Manager',
                'description' => 'Evaluate 8-dimension PR reversibility, rollback plan, and release gates before requesting human approval.',
                'mvt_member' => true,
                'readiness_status' => self::STATUS_READY,
                'execution_mode' => 'read_only',
                'model_policy' => [
                    'tier' => 'release_safety',
                    'provider' => 'kenari',
                    'default_model' => $defaultModel,
                    'fallback' => 'qwen3-5-397b-a17b:free',
                ],
                'permissions' => [
                    'repository_read' => true,
                    'repository_write' => false,
                    'create_branch' => false,
                    'create_pull_request' => false,
                    'merge_pull_request' => false,
                    'production_deploy' => false,
                ],
                'execution' => [
                    'isolated_workspace' => 'required',
                    'concurrency_limit' => 1,
                    'max_runtime_seconds' => 600,
                ],
                'quality_requirements' => [
                    'tests_required' => true,
                    'lint_required' => true,
                    'typecheck_required' => 'when_applicable',
                    'independent_review' => 'required',
                ],
                'contract' => [
                    'required_inputs' => ['commit_sha', 'changed_files', 'diff_text', 'qa_verdict', 'security_verdict'],
                    'required_outputs' => ['reversibility_classification', 'risk_level', 'rollback_plan', 'release_decision'],
                ],
                'handoff' => [
                    'next_role' => null,
                ],
            ],

            'documentation_research_agent' => [
                'role' => 'documentation_research_agent',
                'title' => 'Documentation / Research Agent',
                'description' => 'Perform read-only codebase discovery, architecture audits, and documentation verification.',
                'mvt_member' => false,
                'readiness_status' => self::STATUS_READY,
                'execution_mode' => 'read_only',
                'model_policy' => [
                    'tier' => 'research',
                    'provider' => 'kenari',
                    'default_model' => $defaultModel,
                    'fallback' => 'qwen3-5-397b-a17b:free',
                ],
                'permissions' => [
                    'repository_read' => true,
                    'repository_write' => false,
                    'create_branch' => false,
                    'create_pull_request' => false,
                    'merge_pull_request' => false,
                    'production_deploy' => false,
                ],
                'execution' => [
                    'isolated_workspace' => 'required',
                    'concurrency_limit' => 1,
                    'max_runtime_seconds' => 600,
                ],
                'quality_requirements' => [
                    'tests_required' => false,
                    'lint_required' => false,
                    'typecheck_required' => 'not_applicable',
                    'independent_review' => 'not_applicable',
                ],
                'contract' => [
                    'required_inputs' => ['research_query'],
                    'required_outputs' => ['research_report'],
                ],
                'handoff' => [
                    'next_role' => null,
                ],
            ],
        ];
    }
}
