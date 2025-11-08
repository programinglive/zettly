# Email Integration Checklist

This document tracks every email that Zettly sends, who receives it, and where the behavior lives in code and tests. Update this checklist whenever a new email flow is introduced or an existing one changes.

## Summary Table

| Feature | Trigger | Implementation | Test Coverage |
| --- | --- | --- | --- |
| Email verification | User registers and requires verification | `QueuedVerifyEmail` notification queued by Laravel listener (@app/Providers/EventServiceProvider.php) | `RegistrationTest::test_new_users_can_register` (@tests/Feature/Auth/RegistrationTest.php) |
| Welcome email | User registers successfully | `UserWelcome` mailable queued by `SendWelcomeEmail` listener (@app/Listeners/SendWelcomeEmail.php, @app/Mail/UserWelcome.php) | `RegistrationTest::test_new_users_can_register` (@tests/Feature/Auth/RegistrationTest.php) |
| Password reset | User requests password reset link | `QueuedResetPassword` notification overrides default reset notification (@app/Models/User.php, @app/Notifications/QueuedResetPassword.php) | `PasswordResetLinkControllerTest::test_password_reset_link_sent` (@tests/Feature/Auth/ForgotPasswordTest.php) |
| Todo created | Authenticated user creates a todo | `TodoCreated` mailable queued in `TodoController::store` (@app/Mail/TodoCreated.php, @app/Http/Controllers/TodoController.php) | `TodoTest::test_user_can_create_todo` (@tests/Feature/TodoTest.php) |
| Todo updated | Authenticated user updates an existing todo | `TodoUpdated` mailable queued in `TodoController::update` (@app/Mail/TodoUpdated.php, @app/Http/Controllers/TodoController.php) | `TodoTest::test_user_receives_email_when_todo_updated` (@tests/Feature/TodoTest.php) |
| Todo deleted | Authenticated user deletes a todo (soft delete) | `TodoDeleted` mailable queued in `TodoController::destroy` (@app/Mail/TodoDeleted.php, @app/Http/Controllers/TodoController.php) | `TodoTest::test_user_can_delete_todo` (@tests/Feature/TodoTest.php) |
| Admin test email | Super admin triggers email test page | `TestEmail` mailable dispatched from `EmailTestController::send` (@app/Mail/TestEmail.php, @app/Http/Controllers/EmailTestController.php) | `EmailTestPageTest::test_super_admin_can_send_test_email` (@tests/Feature/Admin/EmailTestPageTest.php) |

## Maintenance Checklist

When adding or modifying an email flow:

1. Implement the mailable/notification and ensure it queues via `ShouldQueue`.
2. Add or update the feature and unit tests verifying dispatch.
3. Update this checklist with the new entry, noting trigger, implementation, and test coverage.
4. Review `config/mail.php` and `.env` to confirm the correct mail transport is configured for the environment.
5. Document any user-facing behavior changes in release notes.

## Configuration References

- **Transport configuration** — `config/mail.php` defines default mailer and available transports.
- **Queue setup** — Ensure the queue worker is running to deliver queued emails; see `docs/reference/PRD.md` for queue operations.

## Last Updated

- {{ date('Y-m-d') }}
