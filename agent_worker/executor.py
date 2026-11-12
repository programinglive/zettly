"""Run one approved repository job in a separate Git worktree."""

import json
import os
import re
import signal
import subprocess
from pathlib import Path



REPOSITORY_NAME = re.compile(r'\A[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+\Z')
SAFE_REF = re.compile(r'\A[a-zA-Z0-9_.-]+\Z')
SAFE_MODEL = re.compile(r'\A[a-zA-Z0-9_.:-]+\Z')
SENSITIVE_PATH = re.compile(r'(^|/)(\.env(?:\..*)?|\.ssh|\.aws|\.config|auth\.json|.*(?:secret|credential|token|private.key).*)$', re.I)
MODEL_PROVIDER = 'kenari'
DEFAULT_MODEL = 'claude-sonnet-5-5'
MODEL_CREDENTIAL = 'KENARI_API_KEY'
WORKER_CREDENTIALS = ('ZETTLY_WORKER_TOKEN', 'GH_TOKEN', 'OPENAI_API_KEY', 'CODEX_API_KEY', MODEL_CREDENTIAL)


class JobExecutor:
    def __init__(self, root, repositories, target_environment='staging', run_command=None):
        self.root = Path(root).resolve()
        self.repositories = repositories
        self.target_environment = target_environment
        self.run_command = run_command or subprocess.run
        if target_environment not in ('development', 'staging', 'production'):
            raise ValueError('Invalid target environment')
        if not isinstance(repositories, dict) or not repositories:
            raise ValueError('At least one repository must be configured')
        for key, config in repositories.items():
            if not SAFE_REF.fullmatch(key) or key in ('.', '..') or not isinstance(config, dict):
                raise ValueError('Unsafe repository key')
            if not REPOSITORY_NAME.fullmatch(config.get('remote', '')):
                raise ValueError('Repository remote must be an owner/name pair')
            base = config.get('base', '')
            if not SAFE_REF.fullmatch(base) or base.startswith('.') or '..' in base:
                raise ValueError('Unsafe base branch')
            for field in ('setup', 'tests'):
                commands = config.get(field, [])
                if not isinstance(commands, list) or (field == 'tests' and not commands) or any(
                    not isinstance(command, list) or not command
                    or any(not isinstance(part, str) or not part for part in command)
                    for command in commands
                ):
                    raise ValueError(f'{field} commands must be argument arrays')

    @classmethod
    def from_environment(cls):
        config_file = os.environ.get('AGENT_REPOSITORIES_FILE')
        if config_file:
            repositories = json.loads(Path(config_file).read_text(encoding='utf-8'))
        else:
            repositories = json.loads(os.environ['AGENT_REPOSITORIES_JSON'])
        return cls(
            os.environ.get('AGENT_WORK_ROOT', '/srv/zettly-agent'),
            repositories,
            os.environ.get('AGENT_TARGET_ENVIRONMENT', 'staging'),
        )

    def repository_for(self, job):
        key = job.get('repository')
        if key not in self.repositories:
            raise ValueError('Repository is not allowlisted')
        return self.repositories[key]

    def branch_for(self, job):
        job_id = job.get('id')
        if type(job_id) is not int or job_id <= 0:
            raise ValueError('Job ID must be a positive integer')
        return f'agent/job-{job_id}'

    def check_staged_paths(self, paths):
        if any(SENSITIVE_PATH.search(path.replace('\\', '/')) for path in paths):
            raise ValueError('A sensitive file was staged')

    def command_environment(self, allow_github=False, allow_model=False, cwd=None):
        environment = os.environ.copy()
        for name in WORKER_CREDENTIALS:
            environment.pop(name, None)
        if allow_github and os.environ.get('GH_TOKEN'):
            environment['GH_TOKEN'] = os.environ['GH_TOKEN']
        if allow_model and os.environ.get(MODEL_CREDENTIAL):
            environment[MODEL_CREDENTIAL] = os.environ[MODEL_CREDENTIAL]
        if cwd is not None:
            # Popen(cwd=...) does not update PWD, and OpenCode resolves its
            # project directory from PWD. Without this the agent edits the
            # service WorkingDirectory instead of the job worktree.
            environment['PWD'] = str(cwd)
        return environment

    def model_reference(self, job):
        model = (job.get('model') or os.environ.get('AGENT_OPENCODE_MODEL') or DEFAULT_MODEL).strip()
        if not SAFE_MODEL.fullmatch(model):
            raise ValueError('Job model must be a safe model identifier')
        return f'{MODEL_PROVIDER}/{model}'

    def _run(self, argv, cwd=None, capture=False, allow_github=False):
        result = self.run_command(
            argv, cwd=cwd, text=True, stdout=subprocess.PIPE if capture else subprocess.DEVNULL,
            stderr=subprocess.DEVNULL, check=False,
            env=self.command_environment(allow_github, cwd=cwd),
        )
        if result.returncode:
            raise RuntimeError(f'{argv[0]} command failed with exit {result.returncode}')
        return result.stdout.strip() if capture else ''

    @staticmethod
    def _log_tail(log_path, limit=1500):
        try:
            data = Path(log_path).read_text(encoding='utf-8', errors='replace')
        except OSError:
            return ''
        tail = data.strip()[-limit:]
        return f': {tail}' if tail else ''

    def _run_with_heartbeat(self, argv, cwd, checkpoint, env=None, log_path=None):
        handle = open(log_path, 'ab') if log_path else None
        try:
            process = subprocess.Popen(
                argv, cwd=cwd, env=env or self.command_environment(cwd=cwd),
                stdout=handle if handle else subprocess.DEVNULL,
                stderr=subprocess.STDOUT if handle else subprocess.DEVNULL,
                start_new_session=os.name == 'posix',
            )
        finally:
            if handle:
                handle.close()
        try:
            while True:
                try:
                    status = process.wait(timeout=20)
                    break
                except subprocess.TimeoutExpired:
                    checkpoint()
        except BaseException:
            if os.name == 'posix':
                os.killpg(process.pid, signal.SIGTERM)
            else:
                process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                if os.name == 'posix':
                    os.killpg(process.pid, signal.SIGKILL)
                else:
                    process.kill()
                process.wait()
            raise
        if status:
            raise RuntimeError(f'{argv[0]} command failed with exit {status}{self._log_tail(log_path) if log_path else ""}')

    def _worktree(self, job, config, checkpoint):
        key = job['repository']
        branch = self.branch_for(job)
        cache = self.root / 'repositories' / key
        worktree = self.root / 'jobs' / str(job['id'])
        self.root.mkdir(parents=True, exist_ok=True)
        cache.parent.mkdir(parents=True, exist_ok=True)
        worktree.parent.mkdir(parents=True, exist_ok=True)
        self._run(['gh', 'auth', 'setup-git'], cwd=self.root, allow_github=True)
        if not cache.exists():
            self._run_with_heartbeat(['gh', 'repo', 'clone', config['remote'], str(cache)], self.root, checkpoint, env=self.command_environment(True))
        if not (cache / '.git').exists():
            raise RuntimeError('Repository cache is not a Git checkout')
        if worktree.exists():
            raise RuntimeError('Job worktree already exists; inspect it before retrying')
        self._run_with_heartbeat(['git', '-C', str(cache), 'fetch', 'origin', config['base']], self.root, checkpoint, env=self.command_environment(True))
        checkpoint()
        self._run_with_heartbeat(['git', '-C', str(cache), 'worktree', 'add', '-b', branch, str(worktree), f"origin/{config['base']}"], self.root, checkpoint)
        return worktree, branch

    def preflight(self):
        if not os.environ.get('GH_TOKEN'):
            raise ValueError('GH_TOKEN is required')
        if not os.environ.get(MODEL_CREDENTIAL):
            raise ValueError('KENARI_API_KEY is required')
        self._run(['gh', 'auth', 'status'], allow_github=True)
        self._run(['opencode', '--version'])

    def execute(self, job, checkpoint, emit_event=None):
        def emit(kind, detail):
            if emit_event:
                try:
                    emit_event(kind, detail)
                except Exception:
                    pass

        config = self.repository_for(job)
        branch = self.branch_for(job)
        emit('worker_phase', f'Setting up repository cache and worktree for branch `{branch}`...')
        worktree, branch = self._worktree(job, config, checkpoint)
        setup_environment = self.command_environment(cwd=worktree)
        for command in config.get('setup', []):
            checkpoint()
            cmd_str = ' '.join(command)
            emit('worker_phase', f'Running setup command: `{cmd_str}`')
            self._run_with_heartbeat(command, worktree, checkpoint, env=setup_environment)
        pending = checkpoint()
        turns = [job['instruction']]
        if pending:
            turns.append('\n'.join(pending))
        agent_environment = self.command_environment(allow_model=True, cwd=worktree)
        model = self.model_reference(job)
        agent_log = self.root / 'jobs' / f'{job["id"]}-agent.log'

        emit('worker_phase', f'OpenCode AI agent started reasoning and implementation (model: `{model}`)...')
        for index, prompt in enumerate(turns):
            argv = ['opencode', 'run', '--standalone', '--auto', '--model', model]
            if index:
                argv.append('--continue')
            argv.append(prompt)
            self._run_with_heartbeat(argv, worktree, checkpoint, env=agent_environment, log_path=agent_log)
        for _ in range(3):
            pending = checkpoint()
            if not pending:
                break
            emit('worker_phase', 'Applying follow-up instruction to OpenCode AI agent...')
            self._run_with_heartbeat(
                ['opencode', 'run', '--standalone', '--auto', '--continue', '--model', model, '\n'.join(pending)],
                worktree, checkpoint, env=agent_environment, log_path=agent_log,
            )

        summary = []
        emit('worker_phase', 'OpenCode agent finished code changes. Executing automated test suite...')
        test_environment = self.command_environment(cwd=worktree)
        for command in config['tests']:
            checkpoint()
            cmd_str = ' '.join(command)
            emit('worker_phase', f'Running automated test: `{cmd_str}`')
            self._run_with_heartbeat(command, worktree, checkpoint, env=test_environment)
            summary.append(' '.join(command) + ': passed')
        checkpoint()
        emit('worker_phase', 'All tests passed. Staging and verifying diff...')
        self._run(['git', 'diff', '--check'], cwd=worktree)
        self._run(['git', 'add', '-A'], cwd=worktree)
        staged = self._run(['git', 'diff', '--cached', '--name-only'], cwd=worktree, capture=True).splitlines()
        if not staged:
            raise RuntimeError('Agent produced no code changes')
        self.check_staged_paths(staged)
        self._run([
            'git', '-c', 'core.hooksPath=/dev/null',
            '-c', 'user.name=Zettly Coding Agent',
            '-c', 'user.email=technology@edmeeclinic.com',
            'commit', '-m', f'feat(agent): complete coding job {job["id"]}',
        ], cwd=worktree)
        sha = self._run(['git', 'rev-parse', 'HEAD'], cwd=worktree, capture=True)
        checkpoint()
        emit('worker_phase', f'Committed changes ({sha[:8]}). Pushing branch `{branch}` to origin...')
        self._run_with_heartbeat(
            ['git', '-c', 'core.hooksPath=/dev/null', 'push', '-u', 'origin', branch],
            worktree, checkpoint, env=self.command_environment(True),
        )
        body = self.root / 'jobs' / f'{job["id"]}-pull-request.md'
        body.write_text(f'Automated coding job #{job["id"]}.\n\nTests: {"; ".join(summary)}\n', encoding='utf-8')
        checkpoint()
        emit('worker_phase', 'Branch pushed. Creating draft pull request on GitHub...')
        pr_url = self._run([
            'gh', 'pr', 'create', '--draft', '--base', config['base'], '--head', branch,
            '--title', f'feat(agent): coding job {job["id"]}', '--body-file', str(body),
        ], cwd=worktree, capture=True, allow_github=True)
        emit('worker_phase', f'Pull request created: {pr_url}')
        return {
            'branch': branch,
            'commit_sha': sha,
            'pr_url': pr_url,
            'test_summary': '; '.join(summary),
            'tests_passed': True,
            'target_environment': self.target_environment,
        }
