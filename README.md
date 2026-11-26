# Parallel Days

When a student's day changes, Parallel Days shows what still fits and what each choice asks them to postpone. This is the Design-focused v2 for MPCS 51238.

**Live app** https://project-darius-e0cc.vercel.app

Choose **Plan the rest of today** to enter your times and tasks, or **See a sample plan** to explore a fictional afternoon. Compare what you can keep and move to later, then confirm one option. Use **Something changed** to select a new start time or mark a task finished and compare again. Personal plans stay in the current browser. The sample stays in the current session.

## What changed since v1

| Feedback | v2 response |
| --- | --- |
| The two homepage actions looked similar. | Each action names the data it uses. The fictional sample opens directly on comparable plans. |
| People learned time and task rules after submitting. The wide remove control was unclear. | Task limits appear beside the fields. A single task, a 20-minute estimate, and a 10-minute protected block all work. Each row has a labeled Remove action. |
| Total open minutes didn't say when the time was available. | Each option shows both total and longest uninterrupted open time. A shared timeline shows the exact intervals and keeps fixed commitments anchored. |
| Relative delay shortcuts made it hard to know what was changing. | Each quick action names the resulting start time. Drafts preserve the saved plan. The next confirmation shows the latest change. |
| In v2 trials, participants had to inspect the timeline to verify that a fixed commitment survived and when the revised plan actually started. | The comparison shows shared commitments above the cards and labels the previous and current start times. |

## Run locally

```sh
npm test
python3 -m http.server 8000
```

Open http://localhost:8000 from this directory. The static app uses browser storage and has no runtime dependencies. The scheduler places each task in one contiguous block and preserves fixed and protected commitments. The existing production deployment uses the Vercel CLI.

## Project fair and submission

- [Verification and screenshots](docs/VERIFICATION.md)
- [Security pass](docs/SECURITY_REVIEW.md)
- [Demo and submission handoff](docs/V2_HANDOFF.md)
- [v2 execution plan](docs/V2_PLAN.md) and [real-user trial notes](docs/USER_TRIALS.md)
- [GitHub issues](https://github.com/DarryDarius/design-build-ship_project/issues)
