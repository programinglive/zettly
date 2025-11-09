# Organization Management

**Introduced in:** v0.10.0 (2025-11-07)

## Overview

Full CRUD operations, member roles, and invite flows for organizations, expanding collaboration across the app.

## Features

### 1. Organization CRUD

Create, read, update, and delete organizations with the following attributes:
- **Name** — Organization display name
- **Slug** — URL-friendly identifier (unique)
- **Description** — Optional organization details
- **Logo URL** — Optional branding image
- **Created By** — User who created the organization
- **Soft Deletes** — Organizations can be restored

### 2. Member Management

- **Invite Members** — Send email invitations to add users
- **Role-Based Access** — Admin and Member roles
- **Remove Members** — Admins can remove team members
- **Update Roles** — Change member permissions
- **Leave Organization** — Members can exit teams
- **Last Admin Protection** — Prevent accidental removal of all admins

### 3. Resource Scoping

Organizations can own:
- **Todos** — Tasks scoped to organization
- **Drawings** — Sketches and diagrams
- **Tags** — Labels for organizing content

Resources cascade delete when organization is removed.

### 4. Authorization

- **Admin:** Create, edit, delete, invite, remove members, change roles
- **Member:** View organization, view resources, leave
- **Non-member:** No access

## Database Schema

### organizations table
```sql
CREATE TABLE organizations (
    id BIGINT PRIMARY KEY,
    created_by BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    logo_url VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);
```

### organization_members table
```sql
CREATE TABLE organization_members (
    id BIGINT PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role ENUM('admin', 'member') DEFAULT 'member',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(organization_id, user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Resource Columns
Added `organization_id` (nullable, cascading delete) to:
- `todos`
- `drawings`
- `tags`

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/organizations` | List organizations |
| GET | `/organizations/create` | Show create form |
| POST | `/organizations` | Store organization |
| GET | `/organizations/{id}` | Show organization |
| GET | `/organizations/{id}/edit` | Show edit form |
| PATCH | `/organizations/{id}` | Update organization |
| DELETE | `/organizations/{id}` | Delete organization |
| POST | `/organizations/{id}/invite` | Invite member |
| DELETE | `/organizations/{id}/members/{member}` | Remove member |
| PATCH | `/organizations/{id}/members/{member}/role` | Update role |
| POST | `/organizations/{id}/leave` | Leave organization |

## Frontend Components

### Pages
- **Pages/Organizations/Index.jsx** — List organizations with grid view
- **Pages/Organizations/Create.jsx** — Create new organization form
- **Pages/Organizations/Show.jsx** — View organization with member management
- **Pages/Organizations/Edit.jsx** — Edit organization with danger zone

### Features
- Pagination for organization lists
- Member invite with email validation
- Role update with confirmation
- Soft delete recovery
- Responsive design

## Backend Implementation

### Models
- **Organization** — Main organization model with relationships
- **OrganizationMember** — Pivot model for member roles
- **User** — Updated with `organizations()` relationship

### Controller
- **OrganizationController** — 10 RESTful methods

### Factory
- **OrganizationFactory** — Test data generation

## Testing

All 14 organization tests passing:

```bash
php artisan test --filter=OrganizationTest
```

Coverage includes:
- CRUD operations
- Authorization checks
- Member management
- Edge cases (last admin protection)
- Soft delete recovery

## Files Modified

- `app/Models/Organization.php` — New model
- `app/Models/OrganizationMember.php` — New pivot model
- `app/Http/Controllers/OrganizationController.php` — New controller
- `routes/web.php` — New routes
- `database/factories/OrganizationFactory.php` — New factory
- `database/migrations/*_create_organizations_table.php` — New migrations
- `resources/js/Pages/Organizations/*.jsx` — New frontend pages
- `tests/Feature/OrganizationTest.php` — New tests

## Related Features

- v0.10.3 — Organization invite CSRF fix
- v0.10.2 — Case-sensitive import fixes
- v0.10.1 — Shadcn component replacement

## Future Enhancements

- Email invitations with acceptance tokens
- Organization analytics dashboard
- Audit logging for member changes
- More granular roles (editor, viewer, etc.)
- Organization switcher in navigation
