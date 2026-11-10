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


if __name__ == '__main__':
    unittest.main()
