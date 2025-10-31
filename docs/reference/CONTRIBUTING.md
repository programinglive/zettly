# Contributing to Zettly

Thank you for your interest in contributing! We welcome pull requests from the community. To keep the process smooth, please follow the guidelines below.

## Getting Started

- Fork the repository and create your branch from `main`.
- Install dependencies:
  ```bash
  composer install
  npm install
  ```
- Copy `.env.example` to `.env` and configure any required environment variables.
- Run the database migrations and optional seeders:
  ```bash
  php artisan migrate
  php artisan db:seed
  ```
- Start the dev servers:
  ```bash
  composer run dev
  # or
  npm run dev
  ```

## Coding Standards

- Follow the existing code style for PHP (PSR-12) and JavaScript/TypeScript.
- Run automated checks locally before opening a pull request:
  ```bash
  vendor\\bin\\phpunit --stop-on-failure
  npm run build
  ```
- Avoid introducing new lint warnings; clean up unused imports and console logs.
- Keep commits logically scoped and use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat: add filters`, `fix: handle null priority`).

## Pull Request Checklist

- Update or add tests covering your changes.
- Update documentation (e.g., `README.md`) when behavior changes.
- Ensure the pull request description explains the motivation, approach, and testing performed.
- Reference related issues using `Fixes #123` when applicable.
- Be responsive to review feedback and keep discussions respectful per the Code of Conduct.

## Reporting Issues

If you run into a bug or would like to propose an enhancement, please open an issue with:

- A clear description of the problem or proposal.
- Steps to reproduce (if applicable).
- Screenshots or logs that help illustrate the issue.
- Suggested solutions or relevant context.

Thanks again for contributing — we appreciate your help in making Zettly better!
