# Todo Application

A modern, full-stack todo list application built with Laravel 12, React, Inertia.js, TailwindCSS, and shadcn/ui. Create, manage, and track your todos with a beautiful and responsive interface.

## Quick Start

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd todoapp
   ```

2. **Install dependencies**
   ```bash
   composer install && npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. **Database setup**
   ```bash
   # Configure your database in .env file
   php artisan migrate
   php artisan db:seed
   ```

5. **Start development server**
   ```bash
   composer run dev
   ```

## Features

### Core Functionality
- ✅ **Create & Manage Todos** - Add, edit, delete, and complete todos
- ✅ **Priority System** - Set priority levels (Low, Medium, High, Urgent) with color-coded badges
- ✅ **Smart Sorting** - Todos automatically sorted by priority and completion status
- ✅ **Tag Management** - Organize todos with customizable colored tags
- ✅ **Todo Linking** - Create relationships between related todos
- ✅ **Dashboard Overview** - Quick stats and priority-based todo insights

### Priority System
The application includes a comprehensive 4-level priority system:
- 🟢 **Low** - Nice to have tasks
- 🟡 **Medium** - Standard tasks (default)
- 🔴 **High** - Important tasks
- 🚨 **Urgent** - Critical tasks requiring immediate attention

Todos are automatically sorted by priority on all pages, ensuring urgent and high-priority items are always visible first.

## Usage

Visit the application in your browser and start managing your todos! The interface is intuitive - create new todos with priority levels, mark them as complete, edit existing ones, and filter by status or priority.

## Release workflow

- **Prerequisites**
  - Follow Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`). Add `BREAKING CHANGE:` to the body for major bumps.
  - Ensure the test-suite passes before releasing.
- **Create a release**
  ```bash
  npm run release
  ```
  This command updates `CHANGELOG.md`, bumps the version in `package.json`/`package-lock.json`, and creates a Git tag.
- **Optional version override**
  ```bash
  npm run release -- --release-as minor
  ```
  Replace `minor` with `major` or `patch` to force a specific SemVer increment.
- **Publish**
  ```bash
  git push --follow-tags
  ```
  Create the GitHub/GitLab release after the push if your CI is not configured to do so automatically.

## Commit message policy

- **Install hooks**
  ```bash
  npm install
  ```
  The `prepare` script runs automatically and installs Husky commit hooks.
- **Enforced format**
  - Commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
  - Examples: `feat(todo): add priority filter`, `fix(api): validate payload`, `chore: update dependencies`.
- **Hook behavior**
  - Husky runs `commitlint` via `.husky/commit-msg`. Non-compliant messages are rejected, preventing the commit.

## Documentation

For detailed API documentation, developer guides, and more information, visit the `/developer` page in the application.

## License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
