# Contributing to Zettly

🎉 Thank you for your interest in contributing! This document outlines how to get involved, how we run the project, and the expectations we have for contributors. If you have any questions, please contact Mahatma Mahardhika at [mahatma.mahardhika@programinglive.com](mailto:mahatma.mahardhika@programinglive.com).

## Table of Contents
- [Project Philosophy](#project-philosophy)
- [Code of Conduct](#code-of-conduct)
- [How to Get Started](#how-to-get-started)
- [Development Workflow](#development-workflow)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)
- [Issue Reporting](#issue-reporting)
- [Community Support](#community-support)

## Project Philosophy
Zettly is an open-source knowledge and productivity platform built to help learners understand modern full-stack development. We strive for clean, well-tested code, inclusive collaboration, and documentation that teaches as much as it guides.

## Code of Conduct
All contributors must follow our [Code of Conduct](./CODE_OF_CONDUCT.md). Reports can be made directly to [mahatma.mahardhika@programinglive.com](mailto:mahatma.mahardhika@programinglive.com).

## How to Get Started
1. **Fork & clone** the repository.
2. Install dependencies:
   ```bash
   composer install
   npm install
   ```
3. Copy the example environment file and configure your local settings:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
4. Set up the database and seed sample data:
   ```bash
   php artisan migrate --seed
   ```
5. Start the development servers:
   ```bash
   composer run dev
   npm run dev
   ```

Refer to the [README](./README.md#quick-start) for additional setup instructions.

## Development Workflow
We use a Git-based workflow:
1. Create a feature branch from `main`.
2. Make focused commits following the [Conventional Commits](https://www.conventionalcommits.org/) specification.
3. Ensure **all tests pass** (`npm test` and `php artisan test`).
4. Update or add documentation for user-facing or developer-facing changes.
5. Submit a pull request using the template provided in [`.github/pull_request_template.md`](./.github/pull_request_template.md).

## Commit Messages
We enforce Conventional Commits via Husky + commitlint. Example prefixes include:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation updates
- `refactor:` for code refactors that don9t change behavior
- `test:` for test-only changes

Run `npx husky install` after cloning to enable the hooks.

## Pull Requests
Before submitting a PR:
- Rebase on top of the latest `main`.
- Ensure linters and formatters have been executed (`npm run lint` when available).
- Include screenshots or videos for UI changes.
- Reference related issues and provide a clear summary of the change.

The pull request template walks you through the full checklist.

## Issue Reporting
We welcome bug reports and feature proposals via GitHub Issues. Please include:
- Clear, descriptive title
- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Screenshots or logs where useful
- Environment details (browser, OS, PHP/Node versions)

If the issue involves sensitive security information, follow our [Security Policy](./SECURITY.md) instead of filing a public issue.

## Community Support
- Join discussions in GitHub Issues and Discussions (coming soon).
- Follow updates on https://programinglive.com.
- Email [mahatma.mahardhika@programinglive.com](mailto:mahatma.mahardhika@programinglive.com) for questions about the roadmap, collaborations, or outreach programs.

We9re excited to learn and build togetherd welcome aboard! 🚀
