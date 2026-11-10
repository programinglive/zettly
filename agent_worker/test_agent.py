import unittest
import json
import urllib.error
from unittest.mock import patch

from agent_worker.agent import AgentWorker, LeaseLost, ZettlyClient


class FakeClient:
    def __init__(self, job=None):
        self.job = job
        self.calls = []

    def claim(self):
        self.calls.append(('claim',))
        return self.job

    def heartbeat(self, job_id, lease):
        self.calls.append(('heartbeat', job_id, lease))

    def instructions(self, job_id, lease, after_id):
        self.calls.append(('instructions', job_id, lease, after_id))
        return []

    def event(self, job_id, lease, kind, detail):
        self.calls.append(('event', job_id, lease, kind, detail))

    def result(self, job_id, lease, artifact):
        self.calls.append(('result', job_id, lease, artifact))

    def fail(self, job_id, lease, summary):
        self.calls.append(('fail', job_id, lease, summary))


class FakeExecutor:
    def __init__(self, artifact=None, error=None):
        self.artifact = artifact
        self.error = error
        self.job = None

    def execute(self, job, checkpoint):
        self.job = job
        checkpoint()
        if self.error:
            raise self.error
        return self.artifact


class AgentWorkerTest(unittest.TestCase):
    def setUp(self):
        self.job = {'id': 7, 'repository': 'zettly', 'instruction': 'Fix login', 'lease_token': 'private-lease'}
        self.artifact = {'branch': 'agent/job-7', 'commit_sha': 'a' * 40, 'test_summary': 'Tests passed', 'tests_passed': True, 'target_environment': 'staging'}

    def test_empty_poll_does_no_work(self):
        client = FakeClient()
        self.assertFalse(AgentWorker(client, FakeExecutor()).run_once())
        self.assertEqual(client.calls, [('claim',)])

    def test_success_reports_review_artifact(self):
        client = FakeClient(self.job)
        executor = FakeExecutor(self.artifact)
        self.assertTrue(AgentWorker(client, executor).run_once())
        self.assertEqual(executor.job, self.job)
        self.assertIn(('result', 7, 'private-lease', self.artifact), client.calls)
        self.assertNotIn(('fail', 7, 'private-lease', 'Tests passed'), client.calls)

    def test_execution_failure_reports_failed_without_commit(self):
        client = FakeClient(self.job)
        self.assertTrue(AgentWorker(client, FakeExecutor(error=RuntimeError('Codex exited 1'))).run_once())
        self.assertIn(('fail', 7, 'private-lease', 'Codex exited 1'), client.calls)
        self.assertFalse(any(call[0] == 'result' for call in client.calls))

    def test_lost_lease_does_not_report_stale_result(self):
        client = FakeClient(self.job)
        self.assertTrue(AgentWorker(client, FakeExecutor(error=LeaseLost())).run_once())
        self.assertFalse(any(call[0] in ('result', 'fail') for call in client.calls))

    def test_checkpoint_reads_incremental_instructions(self):
        client = FakeClient(self.job)
        client.instructions = lambda job_id, lease, after_id: [{'id': 10, 'detail': 'Check sessions'}] if after_id == 0 else []
        artifact = self.artifact

        class CheckingExecutor:
            def execute(self, job, checkpoint):
                self.first = checkpoint()
                self.second = checkpoint()
                return artifact

        executor = CheckingExecutor()
        AgentWorker(client, executor).run_once()
        self.assertEqual(executor.first, ['Check sessions'])
        self.assertEqual(executor.second, [])

    def test_lease_token_is_sent_in_body_and_worker_auth_in_header(self):
        client = ZettlyClient('https://zettly.example', 'worker-secret')

        class Response:
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, *_):
                return False

            def read(self, *_):
                return b'{"data": []}'

        with patch('agent_worker.agent.urllib.request.urlopen', return_value=Response()) as urlopen:
            client.instructions(7, 'private-lease', 3)
        request = urlopen.call_args.args[0]
        self.assertNotIn('private-lease', request.full_url)
        self.assertEqual(json.loads(request.data), {'lease_token': 'private-lease', 'after_id': 3})
        self.assertEqual(request.get_header('Authorization'), 'Bearer worker-secret')

    def test_conflict_is_reported_as_lost_lease_without_response_leak(self):
        client = ZettlyClient('https://zettly.example', 'worker-secret')
        error = urllib.error.HTTPError('https://zettly.example', 409, 'Conflict', {}, None)
        with patch('agent_worker.agent.urllib.request.urlopen', side_effect=error):
            with self.assertRaises(LeaseLost):
                client.heartbeat(7, 'private-lease')


if __name__ == '__main__':
    unittest.main()
