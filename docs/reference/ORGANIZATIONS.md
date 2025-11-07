# Organizations Feature Documentation

## Overview

Organizations enable team collaboration in Zettly by allowing users to create shared workspaces where multiple team members can collaborate on todos, notes, drawings, and tags. Each organization has its own set of members with role-based access control (admin/member).

## Database Schema

### Organizations Table
```sql
CREATE TABLE organizations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    created_by BIGINT NOT NULL FOREIGN KEY REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NULLABLE,
    logo_url VARCHAR(255) NULLABLE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP NULLABLE -- soft deletes
);
```

### Organization Members Table
```sql
CREATE TABLE organization_members (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    organization_id BIGINT NOT NULL FOREIGN KEY REFERENCES organizations(id),
    user_id BIGINT NOT NULL FOREIGN KEY REFERENCES users(id),
    role ENUM('admin', 'member') DEFAULT 'member',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE KEY (organization_id, user_id)
);
```

### Scoped Resources
The following tables have `organization_id` columns added:
- `todos` - nullable, allows personal and organizational todos
- `drawings` - nullable, allows personal and organizational drawings
- `tags` - nullable, allows personal and organizational tags

## Models

### Organization Model
```php
class Organization extends Model {
    // Relationships
    public function creator(): BelongsTo
    public function members(): HasMany
    public function users(): BelongsToMany
    public function todos(): HasMany
    public function drawings(): HasMany
    public function tags(): HasMany
}
```

### OrganizationMember Model
```php
class OrganizationMember extends Model {
    // Relationships
    public function organization(): BelongsTo
    public function user(): BelongsTo
    
    // Helpers
    public function isAdmin(): bool
    public function isMember(): bool
}
```

### User Model (Updated)
```php
class User extends Authenticatable {
    // New relationships
    public function organizations(): BelongsToMany
    public function createdOrganizations(): HasMany
    public function organizationMembers(): HasMany
}
```

## Admin Roles

### Creator is Automatically Admin
When a user creates an organization, they are automatically assigned the **admin** role. This gives them full control over:
- Organization settings (name, description, logo)
- Member management (invite, remove, change roles)
- Organization deletion

### Admin Permissions
- ✅ View organization settings page
- ✅ Edit organization details
- ✅ Delete organization
- ✅ Invite members by email
- ✅ Remove members
- ✅ Change member roles (admin/member)
- ✅ View all members

### Member Permissions
- ✅ View organization details
- ✅ View shared resources (todos, notes, drawings, tags)
- ✅ Create resources in organization
- ✅ Edit own resources
- ✅ Leave organization
- ❌ Cannot manage other members
- ❌ Cannot change organization settings

## API Endpoints

### Organization Management

#### List Organizations
```
GET /organizations
Response: Paginated list of organizations for authenticated user
```

#### Create Organization
```
POST /organizations
Body: {
    "name": "string (required)",
    "description": "string (optional)",
    "logo_url": "url (optional)"
}
Response: Redirect to organization show page
Note: Creator is automatically set as admin
```

#### View Organization
```
GET /organizations/{organization}
Response: Organization details with members list
Authorization: Must be member or creator
```

#### View Organization Settings (Admin Only)
```
GET /organizations/{organization}/settings
Response: Settings page with member management
Authorization: Must be admin
Features:
  - Edit organization details
  - Manage members (invite, remove, change roles)
  - Delete organization
```

#### Edit Organization
```
GET /organizations/{organization}/edit
Response: Edit form
Authorization: Must be admin
```

#### Update Organization
```
PATCH /organizations/{organization}
Body: {
    "name": "string (required)",
    "description": "string (optional)",
    "logo_url": "url (optional)"
}
Response: Redirect to organization show page
Authorization: Must be admin
```

#### Delete Organization
```
DELETE /organizations/{organization}
Response: Redirect to organizations index
Authorization: Must be admin
Note: Soft deletes - data can be recovered
```

### Member Management

#### Invite User
```
POST /organizations/{organization}/invite
Body: {
    "email": "user@example.com"
}
Response: Redirect with success/error message
Authorization: Must be admin
```

#### Remove Member
```
DELETE /organizations/{organization}/members/{member}
Response: Redirect with success/error message
Authorization: Must be admin
Note: Cannot remove last admin
```

#### Update Member Role
```
PATCH /organizations/{organization}/members/{member}/role
Body: {
    "role": "admin|member"
}
Response: Redirect with success/error message
Authorization: Must be admin
```

#### Leave Organization
```
POST /organizations/{organization}/leave
Response: Redirect to organizations index
Authorization: Must be member
Note: Cannot leave if last admin
```

## Frontend Components

### Pages

#### Organizations/Index.jsx
Lists all organizations the user is a member of. Shows:
- Organization name and description
- Member count
- Creation date
- Quick access to create new organization

#### Organizations/Create.jsx
Form to create a new organization with fields:
- Organization name (required)
- Description (optional)
- Logo URL (optional)

#### Organizations/Show.jsx
Displays organization details with:
- Organization info (name, description, creator)
- Members list with roles
- Invite member form (admin only)
- Leave organization button
- Settings button (admin only)

#### Organizations/Settings.jsx (Admin Only)
Comprehensive settings page for organization admins with:
- **Organization Details Section**
  - Edit name, description, logo URL
  - Save changes button
  
- **Members Management Section**
  - List all members with their roles
  - Role selector dropdown (admin/member)
  - Remove member button for each member
  
- **Invite Member Section**
  - Email input field
  - Send invite button
  
- **Organization Info Section**
  - Creator information
  - Creation date
  - Organization ID/slug
  
- **Danger Zone**
  - Delete organization button (irreversible)
  - Requires typing organization name to confirm deletion
  - Prevents accidental deletion

#### Organizations/Edit.jsx
Form to edit organization details with:
- Name, description, logo URL fields
- Danger zone with delete button

## Usage Examples

### Creating an Organization
```javascript
// User navigates to /organizations/create
// Fills form with organization details
// Submits form
// Redirected to organization show page
// User is automatically added as admin
```

### Inviting Members
```javascript
// Organization admin navigates to organization show page
// Enters email of user to invite
// User is added as member
// User can now see organization in their list
// User can view all shared resources
```

### Switching Workspaces
```javascript
// User can view personal todos/notes/drawings
// User can switch to organization workspace
// User sees only organization's shared resources
// Resources are scoped by organization_id
```

## Authorization Rules

### Admin Permissions
- Create organization
- Edit organization details
- Delete organization (requires typing organization name to confirm)
- Invite members
- Remove members
- Change member roles
- View all members
- **Cannot leave organization** (must delete or transfer admin role first)

### Member Permissions
- View organization details
- View shared resources (todos, notes, drawings, tags)
- Create resources in organization
- Edit own resources
- Leave organization (if not the last admin)

### Non-Member
- Cannot access organization
- Cannot view resources
- Cannot perform any actions

## Resource Scoping

### Personal Resources
```php
// Resources with organization_id = NULL belong to user
$personalTodos = auth()->user()->todos()->whereNull('organization_id');
```

### Organization Resources
```php
// Resources with organization_id set belong to organization
$orgTodos = $organization->todos();
```

### Querying Scoped Resources
```php
// Get all resources visible to user (personal + all organizations)
$allTodos = auth()->user()->todos()
    ->whereNull('organization_id')
    ->orWhereIn('organization_id', 
        auth()->user()->organizations()->pluck('id')
    );
```

## Testing

### Test Coverage
- 14 feature tests in `tests/Feature/OrganizationTest.php`
- Tests cover all CRUD operations
- Authorization tests for role-based access
- Edge cases (last admin, duplicate members, etc.)

### Running Tests
```bash
# Run organization tests
php artisan test tests/Feature/OrganizationTest.php

# Run all tests
php artisan test
```

## Security Considerations

### Authorization
- All endpoints validate organization membership
- Admin-only actions check role
- Cannot remove last admin
- Cannot leave if last admin

### Data Isolation
- Resources are scoped by organization_id
- Queries automatically filter by membership
- Soft deletes prevent accidental data loss

### Validation
- Email must exist in system before inviting
- Cannot invite same user twice
- Organization name is required
- Logo URL must be valid URL format

## Future Enhancements

1. **Invitation Tokens** - Send email invitations with acceptance tokens
2. **Role Hierarchy** - Add more granular roles (editor, viewer, etc.)
3. **Audit Logging** - Track all organization changes
4. **Webhooks** - Notify external systems of organization events
5. **Organization Settings** - Customizable permissions per role
6. **Bulk Operations** - Invite multiple users at once
7. **Organization Analytics** - Track activity and metrics
8. **Workspace Switching UI** - Dropdown in navigation to switch organizations

## Troubleshooting

### User Cannot See Organization
- Verify user is in organization_members table
- Check role is not accidentally deleted
- Ensure organization is not soft-deleted

### Cannot Invite User
- Verify email exists in users table
- Check user is not already a member
- Verify you are an admin

### Last Admin Issues
- Promote another member to admin before leaving
- Cannot delete organization if you're last admin
- Cannot remove yourself if you're last admin

## Migration Guide

### Upgrading Existing Installation
```bash
# Run migrations
php artisan migrate

# Create first organization (optional)
php artisan tinker
# Then:
$org = Organization::create([
    'created_by' => User::first()->id,
    'name' => 'Default Organization',
    'slug' => 'default-org',
]);
OrganizationMember::create([
    'organization_id' => $org->id,
    'user_id' => User::first()->id,
    'role' => 'admin',
]);
```

## API Reference

### Request/Response Examples

#### Create Organization
```bash
POST /organizations
Content-Type: application/json

{
    "name": "Acme Corp",
    "description": "Our awesome company",
    "logo_url": "https://example.com/logo.png"
}

Response: 302 Redirect to /organizations/{id}
```

#### Invite Member
```bash
POST /organizations/1/invite
Content-Type: application/json

{
    "email": "john@example.com"
}

Response: 302 Redirect to /organizations/1
Session: { success: "User invited successfully." }
```

#### List Organizations
```bash
GET /organizations?page=1

Response: 200 OK
{
    "data": [
        {
            "id": 1,
            "name": "Acme Corp",
            "description": "...",
            "slug": "acme-corp-abc123",
            "users_count": 5,
            "created_at": "2025-11-07T10:00:00Z"
        }
    ],
    "links": { ... },
    "meta": { ... }
}
```
