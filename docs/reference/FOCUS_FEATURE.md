# Focus Feature Documentation

## Overview

The Focus feature in Zettly allows users to set and track their daily focus. When users log in to the dashboard, they're greeted with a personalized greeting and prompted to set what they want to focus on today. Users can complete their focus, delete it, or set a new one.

## Features

- **Greeting**: Dynamic greeting based on time of day (Good morning/afternoon/evening)
- **Set Focus**: Create a new focus with title and optional description
- **Track Focus**: View current active focus on the dashboard
- **Complete Focus**: Mark focus as completed
- **Delete Focus**: Remove a focus item
- **Focus History**: View all past foci

## Database Schema

### `foci` Table

```sql
CREATE TABLE foci (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL (foreign key to users),
    title VARCHAR(255) NOT NULL,
    description TEXT NULLABLE,
    started_at TIMESTAMP NULLABLE,
    completed_at TIMESTAMP NULLABLE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## Models

### Focus Model

Located at: `app/Models/Focus.php`

**Attributes:**
- `id`: Primary key
- `user_id`: Foreign key to User
- `title`: Focus title (required)
- `description`: Optional description
- `started_at`: When the focus was started
- `completed_at`: When the focus was completed (null if active)
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Methods:**
- `isActive()`: Returns true if focus is started but not completed
- `isCompleted()`: Returns true if focus has a completed_at timestamp
- `user()`: Relationship to User model

### User Model Relationships

Added to `app/Models/User.php`:
- `foci()`: Has many Focus records
- `currentFocus()`: Has one active (not completed) Focus record

## API Endpoints

All endpoints require authentication.

### Get Current Focus
```
GET /focus/current
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "user_id": 1,
        "title": "Complete project proposal",
        "description": "Finish the Q4 project proposal",
        "started_at": "2025-11-04T10:30:00Z",
        "completed_at": null,
        "created_at": "2025-11-04T10:30:00Z",
        "updated_at": "2025-11-04T10:30:00Z"
    }
}
```

### Get All Foci
```
GET /focus
```

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "user_id": 1,
            "title": "Complete project proposal",
            "description": "Finish the Q4 project proposal",
            "started_at": "2025-11-04T10:30:00Z",
            "completed_at": null,
            "created_at": "2025-11-04T10:30:00Z",
            "updated_at": "2025-11-04T10:30:00Z"
        },
        {
            "id": 2,
            "user_id": 1,
            "title": "Review team feedback",
            "description": null,
            "started_at": "2025-11-03T14:00:00Z",
            "completed_at": "2025-11-03T16:30:00Z",
            "created_at": "2025-11-03T14:00:00Z",
            "updated_at": "2025-11-03T16:30:00Z"
        }
    ]
}
```

### Create Focus
```
POST /focus
Content-Type: application/json
```

**Request Body:**
```json
{
    "title": "Complete project proposal",
    "description": "Finish the Q4 project proposal"
}
```

**Response (201 Created):**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "user_id": 1,
        "title": "Complete project proposal",
        "description": "Finish the Q4 project proposal",
        "started_at": "2025-11-04T10:30:00Z",
        "completed_at": null,
        "created_at": "2025-11-04T10:30:00Z",
        "updated_at": "2025-11-04T10:30:00Z"
    }
}
```

**Validation Errors (422):**
```json
{
    "success": false,
    "errors": {
        "title": ["The title field is required."]
    }
}
```

### Complete Focus
```
POST /focus/{focus}/complete
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "user_id": 1,
        "title": "Complete project proposal",
        "description": "Finish the Q4 project proposal",
        "started_at": "2025-11-04T10:30:00Z",
        "completed_at": "2025-11-04T14:30:00Z",
        "created_at": "2025-11-04T10:30:00Z",
        "updated_at": "2025-11-04T14:30:00Z"
    }
}
```

**Error - Already Completed (400):**
```json
{
    "success": false,
    "message": "Focus is already completed"
}
```

**Error - Unauthorized (403):**
```json
{
    "success": false,
    "message": "Unauthorized"
}
```

### Delete Focus
```
DELETE /focus/{focus}
```

**Response:**
```json
{
    "success": true,
    "message": "Focus deleted successfully"
}
```

**Error - Unauthorized (403):**
```json
{
    "success": false,
    "message": "Unauthorized"
}
```

## Frontend Components

### FocusGreeting Component

Located at: `resources/js/Components/FocusGreeting.jsx`

**Features:**
- Displays time-based greeting (Good morning/afternoon/evening)
- Shows current active focus if one exists
- Automatically opens the focus dialog for first-time/first-session users who do not have a focus yet
- Allows user to complete or delete current focus
- When a focus is completed, automatically reopens the dialog with cleared fields so the user can immediately set the next focus
- Provides dialog to set a new focus using an enlarged layout (3xl width, generous spacing) for improved readability
- Handles loading and error states
- Responsive design with Tailwind CSS

**Props:** None (uses hooks for state management)

**Usage:**
```jsx
import FocusGreeting from '../Components/FocusGreeting';

export default function Dashboard() {
    return (
        <div>
            <FocusGreeting />
        </div>
    );
}
```

## Integration

The FocusGreeting component is integrated into the Dashboard page at:
`resources/js/Pages/Dashboard.jsx`

It appears at the top of the main content area, below the header and above the workspace view.

## Testing

Comprehensive test suite available at: `tests/Feature/FocusTest.php`

**Test Coverage:**
- Getting current focus
- Getting all foci
- Creating focus with validation
- Completing focus
- Preventing completion of already completed focus
- Authorization checks (preventing users from modifying other users' foci)
- Deleting focus
- User relationships
- Focus status methods (isActive, isCompleted)

**Run Tests:**
```bash
php artisan test tests/Feature/FocusTest.php
```

## Usage Flow

1. **User logs in and views dashboard**
   - FocusGreeting component loads
   - Fetches current focus via `/focus/current` endpoint
   - If no active focus has ever been created in the current session, the enlarged dialog automatically opens so the user can set one immediately (afterward, it can still be opened manually)

2. **User sets a focus**
   - Clicks "Set Focus" button
   - Dialog opens with title and description fields
   - User enters focus details
   - Submits form via POST to `/focus`
   - Focus is created with `started_at` set to current time
   - Component updates to show active focus

3. **User completes focus**
   - Clicks "Complete Focus" button
   - Sends POST request to `/focus/{id}/complete`
   - Focus is marked with `completed_at` timestamp
   - Dialog automatically reopens with cleared fields, prompting the user to define the next focus

4. **User deletes focus**
   - Clicks "Delete" button
   - Confirmation dialog appears
   - Sends DELETE request to `/focus/{id}`
   - Focus is removed from database
   - Component resets

## Security

- All endpoints require authentication
- Users can only view, complete, or delete their own foci
- Authorization checks prevent cross-user access
- CSRF token validation on all POST/DELETE requests

## Future Enhancements

- Focus duration tracking
- Focus statistics and analytics
- Focus categories/tags
- Focus reminders and notifications
- Focus history export
- Focus templates
- Team focus collaboration
