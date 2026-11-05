# Notification formatting

Activity notifications are short digests. Full journal entries and session history remain in the authenticated report page, available only to its owner.

Discord uses clean, structured Discord Rich Embeds with color-coded status bars (Red for blocked, Amber for urgent, Blurple for normal), an Overview field with metrics, a Needs Attention field prioritizing blocked and urgent actions, and a clickable link to the full report. Telegram uses plain text and disables link previews. Messages preserve line breaks and stay within limits.

Web push titles are limited to 120 UTF-16 units and bodies to 255. These limits apply in the shared delivery service, including CLI callers. Credential redaction runs before markup removal and handles encoded text. HTML report content is escaped when rendered.

Preview a synthetic digest without reading reports, changing delivery records, or sending a message:

```sh
php artisan journal:preview-report --channel=discord
php artisan journal:preview-report --channel=telegram
```

Existing channel configuration, email delivery, retry behavior, and delivery deduplication remain in place. Deployment does not replay previously delivered reports. Queue workers must reload the application after deployment.

Regression coverage includes channel payloads, priority ordering, large reports, emoji length limits, encoded credentials, notification previews, and report ownership checks.
