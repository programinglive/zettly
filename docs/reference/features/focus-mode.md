# Focus Mode

**Introduced in:** v0.8.0 (2025-11-04)

## Overview

The focus timer, history timeline, and digest emails form the foundation of the focus experience, helping users track deep work sessions and productivity patterns.

## Core Features

### 1. Focus Timer

- **Start/Stop Sessions** — Begin and end focus sessions with one click
- **Duration Tracking** — Record how long each session lasted
- **Customizable Prompts** — Randomized suggestions to guide focus work
- **Status Events** — Track session lifecycle (started, paused, completed)

### 2. Focus History

- **Timeline View** — Visual representation of daily focus sessions
- **Completion Tracking** — Record what was accomplished
- **Reason Capture** — Document why work was completed or abandoned
- **Date Filtering** — Review focus history for any day
- **Export** — Download focus data for analysis

### 3. Focus Digest

- **Daily Summary** — Personalized recap of focus sessions
- **Streak Callouts** — Celebrate consecutive focus days
- **Configurable Sections** — Customize digest content
- **Email Delivery** — Automated digest emails
- **Scheduling** — Set preferred delivery time

### 4. Focus Dashboard

- **Recent Sessions** — Quick view of latest focus activity
- **Statistics** — Total hours, sessions, completion rate
- **Trends** — Weekly/monthly focus patterns
- **Quick Start** — Launch focus from dashboard

## Database Schema

### focus_sessions table
```sql
CREATE TABLE focus_sessions (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    workspace_id BIGINT,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_minutes INT,
    status ENUM('active', 'paused', 'completed', 'abandoned'),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
);
```

### focus_status_events table
```sql
CREATE TABLE focus_status_events (
    id BIGINT PRIMARY KEY,
    focus_session_id BIGINT NOT NULL,
    event_type ENUM('started', 'paused', 'resumed', 'completed', 'abandoned'),
    reason TEXT,
    created_at TIMESTAMP,
    FOREIGN KEY (focus_session_id) REFERENCES focus_sessions(id) ON DELETE CASCADE
);
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/focus/start` | Start a focus session |
| POST | `/focus/{id}/stop` | Stop focus session |
| POST | `/focus/{id}/pause` | Pause session |
| POST | `/focus/{id}/resume` | Resume session |
| GET | `/focus/history` | Get focus history |
| GET | `/focus/history?date=2025-11-09` | History for specific date |
| GET | `/focus/digest` | Get digest summary |
| POST | `/focus/digest/email` | Send digest email |

## Frontend Components

### Pages
- **Pages/Focus/Index.jsx** — Focus timer and controls
- **Pages/Focus/History.jsx** — Timeline and history view
- **Pages/Focus/Digest.jsx** — Digest configuration

### Components
- **FocusTimer.jsx** — Timer display and controls
- **FocusPrompt.jsx** — Randomized suggestion display
- **FocusHistory.jsx** — Timeline visualization
- **FocusStats.jsx** — Statistics dashboard
- **FocusDialog.jsx** — Modal for session details

## Features by Version

### v0.8.0 — Foundation
- Focus timer and session tracking
- History timeline
- Digest emails
- Dashboard integration

### v0.8.1 — API Endpoints
- REST endpoints for integrations
- Programmatic session control

### v0.8.3 — Workspace Switcher
- Switch focus context between workspaces
- Per-workspace focus history

### v0.8.4 — Prompt Randomizer
- Shuffled suggestion queue
- Fresh prompts throughout day

### v0.8.5 — Form Persistence
- Recap modals preserve data
- Attachment handling

### v0.8.6 — Modal UX
- Enter key handling in checklists
- Improved keyboard navigation

### v0.8.7 — History Filters
- Filter by project/tag/timeframe
- Advanced search

### v0.8.9 — Demo Data
- FocusSeeder for test data
- Pre-populated history for new users

### v0.9.2 — History Filtering
- Date picker for history
- Backend support for date ranges

## Testing

Run focus tests:

```bash
php artisan test --filter=FocusTest
npm test -- focus.test.js
```

Coverage includes:
- Session lifecycle (start, pause, resume, complete)
- History retrieval and filtering
- Digest generation and email
- Reason capture and validation
- Workspace scoping
- Permission checks

## Files Modified

- `app/Models/FocusSession.php` — New model
- `app/Models/FocusStatusEvent.php` — New model
- `app/Http/Controllers/FocusController.php` — New controller
- `app/Mail/FocusDigest.php` — Digest email
- `resources/js/Pages/Focus/*.jsx` — New pages
- `resources/js/Components/Focus*.jsx` — New components
- `database/migrations/*_create_focus_tables.php` — New migrations
- `tests/Feature/FocusTest.php` — Test coverage

## Configuration

### Environment Variables
```env
FOCUS_DIGEST_TIME=09:00
FOCUS_PROMPT_RANDOMIZE=true
FOCUS_HISTORY_RETENTION_DAYS=90
```

### Settings
- Digest delivery time
- Prompt frequency
- History retention
- Workspace defaults

## Related Features

- v0.10.9 — Welcome email automation
- v0.10.6 — Todo creation emails
- v0.10.13 — Dashboard verification reminder

## Future Enhancements

- Pomodoro timer presets
- Focus music integration
- Distraction tracking
- Focus goals and targets
- Team focus leaderboards
- Calendar integration
