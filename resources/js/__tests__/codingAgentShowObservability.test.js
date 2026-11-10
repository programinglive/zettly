import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('coding agent show observability & real-time worker status', () => {
    const showPath = path.resolve('resources/js/Pages/Agent/Show.jsx');
    const content = fs.readFileSync(showPath, 'utf8');

    it('implements dynamic polling interval for live running or queued jobs', () => {
        // Must dynamically poll faster when job is active (e.g. 3000ms)
        assert.match(content, /job\.status === 'running'|running.*queued|pollInterval|3000/, 'Expected faster polling when job is running');
    });

    it('renders a prominent active worker execution banner when job is running', () => {
        assert.ok(
            content.includes("job.status === 'running'") && (content.includes('Worker is actively executing') || content.includes('Worker Active')),
            'Expected running worker status banner in Show.jsx'
        );
    });

    it('displays the latest execution phase from events', () => {
        assert.ok(
            content.includes('worker_phase') || content.includes('latestPhase') || content.includes('currentPhase'),
            'Expected latest phase display in Show.jsx'
        );
    });

    it('includes a visual progress phase tracker or stepper', () => {
        assert.ok(
            content.includes('Code Generation') || content.includes('Reasoning') || content.includes('Setup') || content.includes('Tests'),
            'Expected phase steps in Show.jsx'
        );
    });
});
