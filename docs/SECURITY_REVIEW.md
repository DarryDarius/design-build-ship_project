# Security review — 2026-11-17

Manual source review for the static v1. The course's `/security-review` command is not available in this Codex session, so this document does not claim that command ran.

- No network requests, model calls, database connection, user accounts, or API keys in the app.
- Personal day inputs stay in this browser's localStorage. The interface states the same-device limitation. Clearing browser data deletes the plan.
- Dynamic task and block titles are added to the DOM with `textContent` or input values, not HTML string interpolation.
- `.env` and `.env.*` are ignored by Git; `.claude/settings.json` denies agents reading them. No `.env` file is required.
- The scheduler checks time format, 15-minute steps, overlap, task bounds, and must-do feasibility. Confirming a plan writes it locally and reads the stored value back before showing success.
- The published site should use HTTPS through Vercel. Verify the deployed URL and inspect the uploaded files before class submission.

Remaining review: run `/security-review` in a client that supports it, and inspect any findings before submission.
