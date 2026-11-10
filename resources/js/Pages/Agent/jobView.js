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
