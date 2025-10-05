# Todo Application

A modern, full-stack todo list application built with Laravel 12, React, Inertia.js, TailwindCSS, and shadcn/ui. This application allows users to create, manage, and track their todos with a beautiful and responsive interface.

## Features

- ✅ **Create Todos** - Add new tasks with titles and descriptions
- ✅ **View Todos** - Browse all todos with filtering options (All, Pending, Completed)
- ✅ **Edit Todos** - Update existing todo details
- ✅ **Delete Todos** - Remove completed or unwanted tasks
- ✅ **Toggle Completion** - Mark todos as complete or incomplete with one click
- ✅ **User Assignment** - Assign todos to different users
- ✅ **Responsive Design** - Works perfectly on desktop and mobile devices
- ✅ **Modern UI** - Clean, intuitive interface built with shadcn/ui components
- ✅ **Real-time Updates** - Seamless SPA experience with Inertia.js

## Technology Stack

- **Backend**: Laravel 12 (PHP 8.2+)
- **Frontend**: React 18 + TypeScript + Inertia.js
- **UI Components**: shadcn/ui (Radix UI + TailwindCSS)
- **Database**: MySQL
- **Build Tool**: Vite
- **Testing**: PHPUnit

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd todoapp
   ```

2. **Install PHP dependencies**
   ```bash
   composer install
   ```

3. **Install Node dependencies**
   ```bash
   npm install
   ```

4. **Environment Setup**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

5. **Database Setup**
   ```bash
   # Configure your database in .env file
   php artisan migrate
   php artisan db:seed
   ```

6. **Build Assets**
   ```bash
   npm run build
   ```

7. **Start the Application**
   ```bash
   php artisan serve
   ```

   Or use the convenient dev script that runs both server and Vite:
   ```bash
   composer run dev
   ```

## Usage

### Web Interface

1. **View Todos**: Visit the homepage to see all todos
2. **Create Todo**: Click "New Todo" to add a new task
3. **Edit Todo**: Click "Edit" on any todo to modify it
4. **Toggle Completion**: Click the checkbox to mark todos as complete/incomplete
5. **Delete Todo**: Use the "Delete" button to remove todos
6. **Filter Todos**: Use the filter buttons to view All, Pending, or Completed todos

### API Endpoints

- `GET /todos` - List all todos
- `POST /todos` - Create a new todo
- `GET /todos/{id}` - View a specific todo
- `PUT /todos/{id}` - Update a todo
- `DELETE /todos/{id}` - Delete a todo
- `POST /todos/{id}/toggle` - Toggle todo completion status

## Database Schema

### Todos Table

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| user_id | bigint | Foreign key to users table |
| title | varchar | Todo title |
| description | text | Todo description (nullable) |
| is_completed | boolean | Completion status |
| completed_at | timestamp | Completion timestamp (nullable) |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

## Testing

Run the test suite:

```bash
# Run all tests
php artisan test

# Run only todo tests
php artisan test --filter=TodoTest

# Run tests with coverage
php artisan test --coverage
```

## Development

### Code Style

This project follows Laravel's coding standards. Run Pint to format code:

```bash
vendor/bin/pint .
```

### Pre-commit Checklist

Before committing code:

1. ✅ Run tests: `php artisan test`
2. 🧼 Format code: `vendor/bin/pint .`
3. 📄 Update README if needed
4. 🗃️ Stage files: `git add .`
5. 💬 Commit with descriptive message

## UI Components

This project uses shadcn/ui components for a consistent and accessible design system:

- **Button** - Primary action buttons
- **Card** - Content containers
- **Input/Textarea** - Form inputs
- **Checkbox** - Boolean inputs
- **Icons** - Lucide React icons

All components are fully customizable and follow accessibility standards.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Ensure all tests pass: `php artisan test`
5. Format code: `vendor/bin/pint .`
6. Commit your changes: `git commit -am 'Add new feature'`
7. Push to the branch: `git push origin feature-name`
8. Submit a pull request

## License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
