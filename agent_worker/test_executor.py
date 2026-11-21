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
            'OPENAI_API_KEY': 'model-secret',
        }):
            safe = executor.command_environment()
            github = executor.command_environment(allow_github=True)
        self.assertNotIn('ZETTLY_WORKER_TOKEN', safe)
        self.assertNotIn('GH_TOKEN', safe)
        self.assertNotIn('OPENAI_API_KEY', safe)
        self.assertEqual(github['GH_TOKEN'], 'github-secret')
        self.assertNotIn('ZETTLY_WORKER_TOKEN', github)

    def test_preflight_requires_dedicated_github_token_before_claim(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)
        with patch.dict(os.environ, {'GH_TOKEN': ''}):
            with self.assertRaisesRegex(ValueError, 'GH_TOKEN is required'):
                executor.preflight()

    def test_lost_lease_terminates_running_codex_process(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)

        class FakeProcess:
            terminated = False
            pid = 1234

            def wait(self, timeout=None):
                if self.terminated:
                    return 0
                raise TimeoutExpired('codex', timeout)

            def terminate(self):
                self.terminated = True

        process = FakeProcess()
        with patch('agent_worker.executor.subprocess.Popen', return_value=process), patch('agent_worker.executor.os.killpg', create=True, side_effect=lambda *_: setattr(process, 'terminated', True)):
            with self.assertRaises(LeaseLost):
                executor._run_with_heartbeat(['codex'], Path(self.root.name), lambda: (_ for _ in ()).throw(LeaseLost()))
        self.assertTrue(process.terminated)

    def test_checkpoint_error_terminates_running_process(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)

        class FakeProcess:
            terminated = False
            pid = 1234

            def wait(self, timeout=None):
                if self.terminated:
                    return 0
                raise TimeoutExpired('codex', timeout)

            def terminate(self):
                self.terminated = True

        process = FakeProcess()
        with patch('agent_worker.executor.subprocess.Popen', return_value=process), patch('agent_worker.executor.os.killpg', create=True, side_effect=lambda *_: setattr(process, 'terminated', True)):
            with self.assertRaisesRegex(RuntimeError, 'network failed'):
                executor._run_with_heartbeat(['codex'], Path(self.root.name), lambda: (_ for _ in ()).throw(RuntimeError('network failed')))
        self.assertTrue(process.terminated)

    def test_execute_passes_model_flag_to_codex(self):
        """codex exec must include --model <model> from the job payload."""
        commands_seen = []

        def fake_run(argv, **kwargs):
            commands_seen.append(list(argv))
            from subprocess import CompletedProcess
            return CompletedProcess(argv, 0, stdout='')

        executor = JobExecutor(Path(self.root.name), self.repositories, run_command=fake_run)

        # Patch _worktree and _run_with_heartbeat so we don't need real git/codex
        worktree = Path(self.root.name) / 'jobs' / '99'
        worktree.mkdir(parents=True, exist_ok=True)
        with patch.object(executor, '_worktree', return_value=(worktree, 'agent/job-99')), \
             patch.object(executor, '_run_with_heartbeat') as mock_hb, \
             patch.object(executor, '_run', side_effect=fake_run):
            # Capture calls to _run_with_heartbeat
            captured_hb_calls = []

            def capture_hb(argv, cwd, checkpoint, env=None):
                captured_hb_calls.append(list(argv))

            mock_hb.side_effect = capture_hb

            job = {'id': 99, 'repository': 'zettly', 'instruction': 'Fix login', 'model': 'gpt-4o-mini:free'}
            try:
                executor.execute(job, lambda: None)
            except Exception:
                pass  # may fail on git commands; we only care about codex call

        codex_calls = [c for c in captured_hb_calls if c and c[0] == 'codex']
        self.assertTrue(any('--model' in c and 'gpt-4o-mini:free' in c for c in codex_calls),
                        f'Expected --model gpt-4o-mini:free in codex call, got: {codex_calls}')

    def test_execute_uses_default_model_when_not_in_job(self):
        """When job has no model field, codex exec defaults to agnes-3-0-flash:free."""
        executor = JobExecutor(Path(self.root.name), self.repositories)

        worktree = Path(self.root.name) / 'jobs' / '100'
        worktree.mkdir(parents=True, exist_ok=True)
        with patch.object(executor, '_worktree', return_value=(worktree, 'agent/job-100')), \
             patch.object(executor, '_run_with_heartbeat') as mock_hb, \
             patch.object(executor, '_run'):

            captured_hb_calls = []

            def capture_hb(argv, cwd, checkpoint, env=None):
                captured_hb_calls.append(list(argv))

            mock_hb.side_effect = capture_hb

            job = {'id': 100, 'repository': 'zettly', 'instruction': 'Fix login'}
            try:
                executor.execute(job, lambda: None)
            except Exception:
                pass

        codex_calls = [c for c in captured_hb_calls if c and c[0] == 'codex']
        self.assertTrue(any('--model' in c and 'agnes-3-0-flash:free' in c for c in codex_calls),
                        f'Expected --model agnes-3-0-flash:free in codex call, got: {codex_calls}')

    def test_execute_emits_worker_phases(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)
        worktree = Path(self.root.name) / 'jobs' / '101'
        worktree.mkdir(parents=True, exist_ok=True)
        emitted_phases = []

        def fake_emit(kind, detail):
            emitted_phases.append((kind, detail))

        def fake_run(argv, cwd=None, capture=False, allow_github=False):
            cmd = argv[0] if argv else ''
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

        self.assertTrue(any(kind == 'worker_phase' and 'Codex AI agent' in detail for kind, detail in emitted_phases))
        self.assertTrue(any(kind == 'worker_phase' and 'automated test' in detail for kind, detail in emitted_phases))
        self.assertTrue(any(kind == 'worker_phase' and 'Pull request created' in detail for kind, detail in emitted_phases))

    def test_command_environment_strips_model_keys_unless_explicitly_allowed(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)
        with patch.dict(os.environ, {
            'KENARI_API_KEY': 'kenari-secret',
            'CODEX_API_KEY': 'codex-secret',
            'OPENAI_API_KEY': 'openai-secret',
        }):
            safe = executor.command_environment()
            model_env = executor.command_environment(allow_model_api=True)
        self.assertNotIn('KENARI_API_KEY', safe)
        self.assertNotIn('CODEX_API_KEY', safe)
        self.assertNotIn('OPENAI_API_KEY', safe)
        self.assertEqual(model_env['CODEX_API_KEY'], 'codex-secret')
        self.assertNotIn('KENARI_API_KEY', model_env)

    def test_execute_read_only_mode_uses_readonly_sandbox_and_skips_git_commit(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)
        worktree = Path(self.root.name) / 'jobs' / '102'
        worktree.mkdir(parents=True, exist_ok=True)
        captured_hb_calls = []

        def capture_hb(argv, cwd, checkpoint, env=None):
            captured_hb_calls.append(list(argv))

        with patch.object(executor, '_worktree', return_value=(worktree, 'agent/job-102')), \
             patch.object(executor, '_run_with_heartbeat', side_effect=capture_hb), \
             patch.object(executor, '_run') as mock_run:
            job = {'id': 102, 'repository': 'zettly', 'instruction': 'Audit architecture', 'mode': 'read_only'}
            res = executor.execute(job, lambda: None)

        self.assertIsNone(res['commit_sha'])
        self.assertIsNone(res['pr_url'])
        self.assertTrue(res['tests_passed'])
        self.assertEqual(res['mode'], 'read_only')
        mock_run.assert_not_called()
        self.assertTrue(any('--sandbox' in c and 'read-only' in c for c in captured_hb_calls))

    def test_invalid_execution_mode_is_rejected(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)
        with self.assertRaisesRegex(ValueError, 'Unsupported execution mode'):
            executor.mode_for({'id': 103, 'repository': 'zettly', 'mode': 'root_shell'})

    def test_worktree_recovers_stale_directory_on_retry(self):
        executor = JobExecutor(Path(self.root.name), self.repositories)
        cache = Path(self.root.name) / 'repositories' / 'zettly'
        (cache / '.git').mkdir(parents=True, exist_ok=True)
        stale_worktree = Path(self.root.name) / 'jobs' / '104'
        stale_worktree.mkdir(parents=True, exist_ok=True)
        (stale_worktree / 'leftover.txt').write_text('stale', encoding='utf-8')

        run_calls = []

        def fake_run(argv, cwd=None, capture=False, allow_github=False):
            run_calls.append(list(argv))
            if 'remove' in argv:
                raise RuntimeError('not a registered worktree')
            return ''

        with patch.object(executor, '_run', side_effect=fake_run), \
             patch.object(executor, '_run_with_heartbeat'):
            worktree, branch = executor._worktree(
                {'id': 104, 'repository': 'zettly'},
                self.repositories['zettly'],
                lambda: None,
            )

        self.assertEqual(branch, 'agent/job-104')
        self.assertFalse(stale_worktree.exists())
        self.assertTrue(any('worktree' in c and 'remove' in c for c in run_calls))

    def test_verify_provider_requires_api_key_and_handles_http_status(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(ValueError, 'API key is required'):
                JobExecutor.verify_provider()

        class FakeResponse:
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        with patch('agent_worker.executor.urllib.request.urlopen', return_value=FakeResponse()):
            result = JobExecutor.verify_provider(
                base_url='https://kenari.id/v1',
                api_key='test-only-key',
                model='agnes-3-0-flash:free',
            )
        self.assertTrue(result['ok'])
        self.assertEqual(result['status'], 200)
        self.assertNotIn('test-only-key', str(result))

        import urllib.error
        with patch(
            'agent_worker.executor.urllib.request.urlopen',
            side_effect=urllib.error.HTTPError('https://kenari.id/v1/chat/completions', 401, 'Unauthorized', {}, None),
        ):
            failed = JobExecutor.verify_provider(
                base_url='https://kenari.id/v1',
                api_key='test-only-key',
                model='agnes-3-0-flash:free',
            )
        self.assertFalse(failed['ok'])
        self.assertEqual(failed['status'], 401)
        self.assertNotIn('test-only-key', str(failed))


if __name__ == '__main__':
    unittest.main()
