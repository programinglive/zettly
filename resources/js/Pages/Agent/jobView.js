const labels = {
    queued: 'Queued', running: 'Running', needs_input: 'Needs input',
    paused: 'Paused', review: 'Ready for review', failed: 'Failed',
    cancelled: 'Cancelled', release_pending: 'Release pending', completed: 'Completed',
};

export const statusLabel = (status) => labels[status] ?? status;

export const heartbeatLabel = (timestamp, now = Date.now()) => {
    if (!timestamp) return 'Waiting for worker';
    const age = now - Date.parse(timestamp);
    if (!Number.isFinite(age)) return 'Connection unknown';
    return age > 180000 ? 'Connection stale' : 'Worker connected';
};

export const canApprove = (job, sha, environment) =>
    job.status === 'review' && job.tests_passed === true
    && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(sha ?? '')
    && job.commit_sha === sha && job.target_environment === environment;

export const createRequestId = (uuid = () => crypto.randomUUID(), existing = null) => existing ?? uuid();

const stripHtml = (value = '') =>
    String(value ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .trim();

export const buildTodoSpecInstruction = (todo, repoMeta = null) => {
    if (!todo) return '';
    const sections = [`# Task: ${todo.title} (Todo #${todo.id})`];

    const cleanDescription = stripHtml(todo.description);
    if (cleanDescription) {
        sections.push(`## Context & Acceptance Criteria\n${cleanDescription}`);
    }

    const checklist = Array.isArray(todo.checklist_items) ? todo.checklist_items : [];
    if (checklist.length > 0) {
        const lines = checklist.map((item) => `- [${item.is_completed ? 'x' : ' '}] ${item.title}`);
        sections.push(`## Definition of Done (Checklist)\n${lines.join('\n')}`);
    }

    if (repoMeta) {
        const metaLines = [
            `- Repository: ${repoMeta.remote || repoMeta.slug} (base branch: ${repoMeta.base || 'main'}, stack: ${repoMeta.stack || 'Laravel'})`,
        ];
        if (repoMeta.checks) {
            metaLines.push(`- Required Verification Command: \`${repoMeta.checks}\``);
        }
        sections.push(`## Repository & Verification Gate\n${metaLines.join('\n')}`);
    }

    return sections.join('\n\n');
};

export const filterJobsByStage = (jobs = [], stage = 'all') => {
    if (!Array.isArray(jobs) || stage === 'all') return jobs;
    const stageMap = {
        queued: ['queued'],
        running: ['running', 'paused'],
        needs_input: ['needs_input'],
        review: ['review', 'release_pending'],
        completed: ['completed'],
        attention: ['failed', 'cancelled'],
    };
    const allowed = stageMap[stage] ?? [stage];
    return jobs.filter((job) => allowed.includes(job.status));
};

