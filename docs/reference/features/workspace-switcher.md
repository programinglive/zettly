# Workspace Switcher

**Introduced in:** v0.4.5 (2025-10-18)

## Overview

Rapid context switching between personal and work focus areas, allowing users to organize todos, drawings, and notes by workspace.

## Core Features

### 1. Workspace Management

- **Create Workspaces** — Add new workspace with name and description
- **List Workspaces** — View all user workspaces
- **Switch Workspaces** — Change active workspace
- **Edit Workspaces** — Update workspace details
- **Delete Workspaces** — Remove workspaces (with confirmation)
- **Archive Workspaces** — Soft delete for recovery

### 2. Workspace Scoping

- **Todos** — Each todo belongs to a workspace
- **Drawings** — Sketches organized by workspace
- **Tags** — Labels scoped to workspace
- **Notes** — Personal knowledge per workspace
- **Focus Sessions** — Track focus per workspace

### 3. Navigation

- **Workspace Selector** — Dropdown in navbar
- **Quick Switch** — Keyboard shortcut (Cmd+K)
- **Recent Workspaces** — Quick access to frequently used
- **Workspace Icon** — Visual identifier
- **Member Count** — Show collaborators

### 4. Preferences

- **Default Workspace** — Set on login
- **Workspace Preferences** — Per-workspace settings
- **View Mode** — Kanban vs Eisenhower per workspace
- **Sidebar Collapse** — Remember state per workspace

## Database Schema

### workspaces table
```sql
CREATE TABLE workspaces (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    description TEXT,
    icon_url VARCHAR(255),
    color VARCHAR(7),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### workspace_members table
```sql
CREATE TABLE workspace_members (
    id BIGINT PRIMARY KEY,
    workspace_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role ENUM('owner', 'editor', 'viewer') DEFAULT 'editor',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(workspace_id, user_id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Resource Columns
Added `workspace_id` to:
- `todos`
- `drawings`
- `tags`
- `notes`
- `focus_sessions`

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/workspaces` | List workspaces |
| GET | `/workspaces/create` | Show create form |
| POST | `/workspaces` | Store workspace |
| GET | `/workspaces/{id}` | Show workspace |
| GET | `/workspaces/{id}/edit` | Show edit form |
| PATCH | `/workspaces/{id}` | Update workspace |
| DELETE | `/workspaces/{id}` | Delete workspace |
| POST | `/workspaces/{id}/switch` | Switch active workspace |
| PATCH | `/workspaces/{id}/preference` | Update preference |

## Frontend Components

### Pages
- **Pages/Workspaces/Index.jsx** — List workspaces
- **Pages/Workspaces/Create.jsx** — Create form
- **Pages/Workspaces/Show.jsx** — Workspace details
- **Pages/Workspaces/Edit.jsx** — Edit form

### Components
- **WorkspaceSwitcher.jsx** — Navbar dropdown
- **WorkspaceSelector.jsx** — Modal selector
- **WorkspaceCard.jsx** — Workspace preview
- **WorkspaceIcon.jsx** — Visual identifier

## Features by Version

### v0.4.5 — Foundation
- Workspace CRUD
- Workspace switcher in navbar
- Basic scoping

### v0.4.0-v0.4.4 — Preparation
- Database schema
- Backend routes
- Frontend pages

### v0.8.3 — Focus Integration
- Focus workspace switcher
- Per-workspace focus history

### v0.10.15 — Preference CSRF
- Fixed workspace preference 419 errors
- CSRF token refresh and retry

## Testing

Run workspace tests:

```bash
php artisan test --filter=WorkspaceTest
npm test -- workspace.test.js
```

Coverage includes:
- CRUD operations
- Workspace switching
- Resource scoping
- Permission checks
- Preference persistence
- CSRF token handling

## Key Bug Fixes

### v0.10.15 — Preference CSRF
**Problem:** Workspace preference updates failing with 419 errors
**Solution:** Refresh CSRF tokens and retry once before persisting

## Files Modified

- `app/Models/Workspace.php` — New model
- `app/Models/WorkspaceMember.php` — New pivot model
- `app/Http/Controllers/WorkspaceController.php` — New controller
- `resources/js/Pages/Workspaces/*.jsx` — New pages
- `resources/js/Components/WorkspaceSwitcher.jsx` — Navbar component
- `database/migrations/*_create_workspaces_table.php` — New migrations
- `tests/Feature/WorkspaceTest.php` — Test coverage

## Configuration

### Environment Variables
```env
WORKSPACE_DEFAULT_NAME=Personal
WORKSPACE_MAX_PER_USER=10
WORKSPACE_MEMBER_LIMIT=50
```

### Settings
- Default workspace name
- Maximum workspaces per user
- Member limit per workspace
- Soft delete retention

## Related Features

- v0.4.0 — Kanban workspace
- v0.7.0 — Eisenhower matrix
- v0.10.0 — Organization management
- v0.8.0 — Focus mode

## Future Enhancements

- Workspace templates
- Workspace sharing/collaboration
- Workspace analytics
- Workspace archival
- Workspace migration
- Team workspaces (vs personal)
- Workspace roles and permissions
