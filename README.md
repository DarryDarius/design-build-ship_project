# Parallel Days

When a student's day changes, Parallel Days shows feasible ways to use the time left and makes the cost of each choice visible. This is the Design-focused v1 for MPCS 51238.

## Try it

**Live:** https://project-darius-e0cc.vercel.app

Open the published site, choose **Use my remaining day** or **Try a sample day**, enter a window, fixed commitments, protected time, and two to five tasks. Compare the possibilities, confirm one, then use **Something changed** to replan after another delay. The quick choices move the saved start 30, 45, or 60 minutes later; if that time has already passed, the app starts from the current time. You can also mark a task finished for the new draft or add a task. The saved plan stays in place until another choice is confirmed. Tasks are scheduled, never marked completed automatically. Confirmed plans are saved only in this browser.

The sample is fictional. Accounts, calendar sync, notifications, AI, and cross-device storage are outside v1. The earlier proposal is preserved at [`proposal/index.html`](proposal/index.html). This scope change lets v1 test the decision flow directly.

## Run locally

Requires a recent Node.js for tests and Python 3 for the simple local server. There are no runtime dependencies or API keys.

```sh
npm test
python3 -m http.server 8000
```

Visit `http://localhost:8000`. The root page is the app. The scheduling engine lives in `src/scheduler.js` and rejects overlaps, 15-minute violations, and must-do work that cannot fit. Each task needs one uninterrupted block. It never moves fixed or protected time.

## Status and submission

The [execution plan](V1_EXECUTION_PLAN.md) contains the product scope, acceptance criteria, and trial script. [Trial notes](docs/USER_TRIALS.md) now contain one user-supplied desktop trial report; the [v2 plan](docs/V2_PLAN.md) is provisional until more target users and a real phone are tested. Automated checks and the fictional sample are not user research. Run `/security-review` in a client that supports it before class submission. No `.env` file is needed for this static app; the repository includes an agent deny rule and Git ignore rules for one if added later.

Vercel published the current version via CLI. Its GitHub auto-deploy connection was rejected by Vercel, so deploy later changes manually with `npx vercel deploy --prod` until that account integration is fixed.
