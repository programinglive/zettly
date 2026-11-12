import tempfile
import unittest
import os
from pathlib import Path
from subprocess import TimeoutExpired
from unittest.mock import patch

from agent_worker.executor import JobExecutor
from agent_worker.agent import LeaseLost


class JobExecutorTest(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.TemporaryDirectory()
        self.addCleanup(self.root.cleanup)
        self.repositories = {
            'zettly': {
                'remote': 'programinglive/zettly',
                'base': 'main',
                'tests': [['php', 'artisan', 'test', '--compact']],
            },
        }

    def test_unlisted_repository_is_rejected_before_any_command(self):
        commands = []
        executor = JobExecutor(Path(self.root.name), self.repositories, run_command=lambda *args: commands.append(args))
        with self.assertRaisesRegex(ValueError, 'not allowlisted'):
            executor.repository_for({'repository': '../production', 'id': 1})
        self.assertEqual(commands, [])

    def test_branch_name_uses_numeric_job_id_only(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)
        self.assertEqual(executor.branch_for({'repository': 'zettly', 'id': 7}), 'agent/job-7')
        with self.assertRaises(ValueError):
            executor.branch_for({'repository': 'zettly', 'id': '../../main'})

    def test_configuration_rejects_shell_commands_and_unsafe_base(self):
        with self.assertRaises(ValueError):
            JobExecutor(Path(self.root.name), {'zettly': {'remote': 'programinglive/zettly', 'base': 'main', 'tests': ['npm test']}})
        with self.assertRaises(ValueError):
            JobExecutor(Path(self.root.name), {'zettly': {'remote': 'programinglive/zettly', 'base': '../main', 'tests': []}})

    def test_staged_secret_paths_are_rejected(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)
        with self.assertRaisesRegex(ValueError, 'sensitive'):
            executor.check_staged_paths(['app.py', '.env.production'])
        executor.check_staged_paths(['app.py', 'tests/test_app.py'])

    def test_repository_commands_do_not_inherit_worker_credentials(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)
        with patch.dict(os.environ, {
            'ZETTLY_WORKER_TOKEN': 'private-lease', 'GH_TOKEN': 'github-secret',
            'OPENAI_API_KEY': 'legacy-openai', 'CODEX_API_KEY': 'legacy-codex',
            'KENARI_API_KEY': 'kenari-secret',
        }):
            safe = executor.command_environment()
            github = executor.command_environment(allow_github=True)
            model = executor.command_environment(allow_model=True)
        for name in ('ZETTLY_WORKER_TOKEN', 'GH_TOKEN', 'OPENAI_API_KEY', 'CODEX_API_KEY', 'KENARI_API_KEY'):
            self.assertNotIn(name, safe)
        self.assertEqual(github['GH_TOKEN'], 'github-secret')
        self.assertNotIn('ZETTLY_WORKER_TOKEN', github)
        self.assertNotIn('KENARI_API_KEY', github)
        self.assertEqual(model['KENARI_API_KEY'], 'kenari-secret')
        self.assertNotIn('GH_TOKEN', model)
        self.assertNotIn('ZETTLY_WORKER_TOKEN', model)

    def test_preflight_requires_dedicated_github_token_before_claim(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)
        with patch.dict(os.environ, {'GH_TOKEN': ''}):
            with self.assertRaisesRegex(ValueError, 'GH_TOKEN is required'):
                executor.preflight()

    def test_preflight_requires_kenari_key_before_claim(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)
        with patch.dict(os.environ, {'GH_TOKEN': 'github-secret', 'KENARI_API_KEY': ''}):
            with self.assertRaisesRegex(ValueError, 'KENARI_API_KEY is required'):
                executor.preflight()

    def test_preflight_checks_opencode_cli_instead_of_codex(self):
        commands = []

        def fake_run(argv, **kwargs):
            commands.append(list(argv))
            from subprocess import CompletedProcess
            return CompletedProcess(argv, 0, stdout='')

        executor = JobExecutor(Path(self.root.name), self.repositories, run_command=fake_run)
        with patch.dict(os.environ, {'GH_TOKEN': 'github-secret', 'KENARI_API_KEY': 'kenari-secret'}):
            executor.preflight()
        binaries = [command[0] for command in commands]
        self.assertIn('opencode', binaries)
        self.assertNotIn('codex', binaries)

    def test_lost_lease_terminates_running_opencode_process(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)

        class FakeProcess:
            terminated = False
            pid = 1234

            def wait(self, timeout=None):
                if self.terminated:
                    return 0
                raise TimeoutExpired('opencode', timeout)

            def terminate(self):
                self.terminated = True

        process = FakeProcess()
        with patch('agent_worker.executor.subprocess.Popen', return_value=process), patch('agent_worker.executor.os.killpg', create=True, side_effect=lambda *_: setattr(process, 'terminated', True)):
            with self.assertRaises(LeaseLost):
                executor._run_with_heartbeat(['opencode'], Path(self.root.name), lambda: (_ for _ in ()).throw(LeaseLost()))
        self.assertTrue(process.terminated)

    def test_checkpoint_error_terminates_running_process(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)

        class FakeProcess:
            terminated = False
            pid = 1234

            def wait(self, timeout=None):
                if self.terminated:
                    return 0
                raise TimeoutExpired('opencode', timeout)

            def terminate(self):
                self.terminated = True

        process = FakeProcess()
        with patch('agent_worker.executor.subprocess.Popen', return_value=process), patch('agent_worker.executor.os.killpg', create=True, side_effect=lambda *_: setattr(process, 'terminated', True)):
            with self.assertRaisesRegex(RuntimeError, 'network failed'):
                executor._run_with_heartbeat(['opencode'], Path(self.root.name), lambda: (_ for _ in ()).throw(RuntimeError('network failed')))
        self.assertTrue(process.terminated)

    def _capture_agent_calls(self, job, pending=None):
        executor = JobExecutor(Path(self.root.name), self.repositories)
        worktree = Path(self.root.name) / 'jobs' / str(job['id'])
        worktree.mkdir(parents=True, exist_ok=True)
        captured = []

        def capture_hb(argv, cwd, checkpoint, env=None):
            captured.append({'argv': list(argv), 'env': env})

        def fake_run(argv, cwd=None, capture=False, allow_github=False):
            if 'diff' in argv and '--cached' in argv:
                return 'app/Http/Controllers/HomeController.php'
            if 'rev-parse' in argv:
                return 'abcdef1234567890abcdef1234567890abcdef12'
            if 'pr' in argv and 'create' in argv:
                return 'https://github.com/programinglive/zettly/pull/12'
            return ''

        with patch.object(executor, '_worktree', return_value=(worktree, f"agent/job-{job['id']}")), \
             patch.object(executor, '_run_with_heartbeat', side_effect=capture_hb), \
             patch.object(executor, '_run', side_effect=fake_run):
            result = executor.execute(job, lambda: pending, emit_event=lambda kind, detail: None)
        return captured, result

    def test_execute_runs_opencode_with_kenari_model(self):
        captured, _ = self._capture_agent_calls(
            {'id': 99, 'repository': 'zettly', 'instruction': 'Fix login', 'model': 'kimi-k2-7-code'}
        )
        agent_calls = [call['argv'] for call in captured if call['argv'] and call['argv'][0] == 'opencode']
        self.assertTrue(agent_calls, f'Expected an opencode invocation, got: {[c["argv"] for c in captured]}')
        argv = agent_calls[0]
        self.assertEqual(argv[1], 'run')
        self.assertIn('--standalone', argv)
        self.assertIn('--auto', argv)
        self.assertIn('--model', argv)
        self.assertEqual(argv[argv.index('--model') + 1], 'kenari/kimi-k2-7-code')

    def test_execute_uses_default_kenari_model_when_not_in_job(self):
        captured, _ = self._capture_agent_calls(
            {'id': 100, 'repository': 'zettly', 'instruction': 'Fix login'}
        )
        agent_calls = [call['argv'] for call in captured if call['argv'] and call['argv'][0] == 'opencode']
        self.assertTrue(agent_calls)
        argv = agent_calls[0]
        self.assertEqual(argv[argv.index('--model') + 1], 'kenari/claude-sonnet-5-5')

    def test_execute_never_invokes_codex(self):
        captured, _ = self._capture_agent_calls(
            {'id': 102, 'repository': 'zettly', 'instruction': 'Fix login'}
        )
        binaries = {call['argv'][0] for call in captured if call['argv']}
        self.assertNotIn('codex', binaries)

    def test_execute_scopes_kenari_key_to_the_agent_process_only(self):
        captured, _ = self._capture_agent_calls(
            {'id': 103, 'repository': 'zettly', 'instruction': 'Fix login'}
        )
        with patch.dict(os.environ, {'KENARI_API_KEY': 'kenari-secret', 'GH_TOKEN': 'github-secret'}):
            captured, _ = self._capture_agent_calls(
                {'id': 104, 'repository': 'zettly', 'instruction': 'Fix login'}
            )
        agent_calls = [call for call in captured if call['argv'] and call['argv'][0] == 'opencode']
        self.assertTrue(agent_calls)
        self.assertEqual(agent_calls[0]['env']['KENARI_API_KEY'], 'kenari-secret')
        self.assertNotIn('GH_TOKEN', agent_calls[0]['env'])
        test_calls = [call for call in captured if call['argv'] and call['argv'][0] == 'php']
        self.assertTrue(test_calls)
        self.assertNotIn('KENARI_API_KEY', test_calls[0]['env'])

    def test_follow_up_instruction_continues_the_opencode_session(self):
        captured, _ = self._capture_agent_calls(
            {'id': 105, 'repository': 'zettly', 'instruction': 'Fix login'},
            pending=['Also update the tests'],
        )
        agent_calls = [call['argv'] for call in captured if call['argv'] and call['argv'][0] == 'opencode']
        self.assertGreaterEqual(len(agent_calls), 2)
        self.assertNotIn('--continue', agent_calls[0])
        self.assertIn('--continue', agent_calls[1])

    def test_execute_emits_worker_phases(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)
        worktree = Path(self.root.name) / 'jobs' / '101'
        worktree.mkdir(parents=True, exist_ok=True)
        emitted_phases = []

        def fake_emit(kind, detail):
            emitted_phases.append((kind, detail))

        def fake_run(argv, cwd=None, capture=False, allow_github=False):
            if 'diff' in argv and '--cached' in argv:
                return 'app/Http/Controllers/HomeController.php'
            if 'rev-parse' in argv:
                return 'abcdef1234567890abcdef1234567890abcdef12'
            if 'pr' in argv and 'create' in argv:
                return 'https://github.com/programinglive/zettly/pull/12'
            return ''

        with patch.object(executor, '_worktree', return_value=(worktree, 'agent/job-101')), \
             patch.object(executor, '_run_with_heartbeat'), \
             patch.object(executor, '_run', side_effect=fake_run):
            job = {'id': 101, 'repository': 'zettly', 'instruction': 'Fix login'}
            res = executor.execute(job, lambda: None, emit_event=fake_emit)
            self.assertEqual(res['pr_url'], 'https://github.com/programinglive/zettly/pull/12')

        self.assertTrue(any(kind == 'worker_phase' and 'OpenCode AI agent' in detail for kind, detail in emitted_phases))
        self.assertTrue(any(kind == 'worker_phase' and 'automated test' in detail for kind, detail in emitted_phases))
        self.assertTrue(any(kind == 'worker_phase' and 'Pull request created' in detail for kind, detail in emitted_phases))


if __name__ == '__main__':
    unittest.main()
