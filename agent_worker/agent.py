"""Outbound Zettly job polling and lease-aware orchestration."""

import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone


class LeaseLost(Exception):
    """The server has revoked or replaced this job lease."""


class ZettlyClient:
    def __init__(self, base_url, token, timeout=20):
        if not base_url.startswith('https://'):
            raise ValueError('Zettly URL must use HTTPS')
        if not token:
            raise ValueError('A dedicated worker token is required')
        self.base_url = base_url.rstrip('/')
        self.token = token
        self.timeout = timeout

    def _request(self, method, path, payload=None):
        data = json.dumps(payload).encode('utf-8') if payload is not None else None
        request = urllib.request.Request(
            self.base_url + '/api/v1/coding-agent/' + path,
            data=data,
            method=method,
            headers={
                'Authorization': 'Bearer ' + self.token,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                if response.status == 204:
                    return None
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 409:
                raise LeaseLost() from None
            raise RuntimeError(f'Zettly API returned HTTP {error.code}') from None

    def claim(self):
        response = self._request('POST', 'claim', {})
        return response['data'] if response else None

    def heartbeat(self, job_id, lease):
        self._request('POST', f'jobs/{job_id}/heartbeat', {'lease_token': lease})

    def instructions(self, job_id, lease, after_id):
        response = self._request('POST', f'jobs/{job_id}/instructions', {'lease_token': lease, 'after_id': after_id})
        return response['data']

    def event(self, job_id, lease, kind, detail):
        self._request('POST', f'jobs/{job_id}/events', {
            'lease_token': lease,
            'event_key': f'{job_id}-{kind}-{int(time.time_ns())}',
            'kind': kind,
            'detail': detail[:2000],
            'occurred_at': datetime.now(timezone.utc).isoformat(),
        })

    def result(self, job_id, lease, artifact):
        self._request('POST', f'jobs/{job_id}/result', {'lease_token': lease, **artifact})

    def fail(self, job_id, lease, summary):
        self._request('POST', f'jobs/{job_id}/fail', {'lease_token': lease, 'summary': summary[:2000]})


class AgentWorker:
    def __init__(self, client, executor):
        self.client = client
        self.executor = executor

    def run_once(self):
        job = self.client.claim()
        if not job:
            return False

        job_id = job['id']
        lease = job['lease_token']
        last_instruction_id = 0

        def checkpoint():
            nonlocal last_instruction_id
            self.client.heartbeat(job_id, lease)
            events = self.client.instructions(job_id, lease, last_instruction_id)
            if events:
                last_instruction_id = max(event['id'] for event in events)
            return [event['detail'] for event in events]

        def emit_event(kind, detail):
            try:
                self.client.event(job_id, lease, kind, detail)
            except Exception:
                pass

        try:
            emit_event('worker_phase', f'Worker claimed job #{job_id}. Starting execution...')
            try:
                artifact = self.executor.execute(job, checkpoint, emit_event=emit_event)
            except TypeError:
                artifact = self.executor.execute(job, checkpoint)
            self.client.result(job_id, lease, artifact)
            emit_event('worker_phase', f'Job #{job_id} completed successfully.')
        except LeaseLost:
            return True
        except Exception as error:
            try:
                emit_event('worker_phase', f'Worker execution failed: {str(error)[:200]}')
                self.client.fail(job_id, lease, str(error)[:2000] or type(error).__name__)
            except LeaseLost:
                pass
        return True


def main():
    from agent_worker.executor import JobExecutor

    client = ZettlyClient(os.environ['ZETTLY_URL'], os.environ['ZETTLY_WORKER_TOKEN'])
    executor = JobExecutor.from_environment()
    executor.preflight()
    worker = AgentWorker(client, executor)
    while True:
        if not worker.run_once():
            time.sleep(15)


if __name__ == '__main__':
    main()
