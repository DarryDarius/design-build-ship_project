# Parallel Days

When a student's day changes, Parallel Days shows feasible ways to use the time left and makes the cost of each choice visible. This is the Design-focused v1 for MPCS 51238.

## Try it

**Live:** https://project-darius-e0cc.vercel.app

Open the published site, choose **Use my remaining day** or **Try a sample day**, enter a window, fixed commitments, protected time, and two to five tasks. Compare the possibilities, confirm one, then use **Something changed** to replan after another delay. Tasks are scheduled, never marked completed automatically. Confirmed plans are saved only in this browser.

The sample is fictional. Accounts, calendar sync, notifications, AI, and cross-device storage are outside v1. The earlier proposal is preserved at [`proposal/index.html`](proposal/index.html). This scope change lets v1 test the decision flow directly.

## Run locally

Requires a recent Node.js for tests and Python 3 for the simple local server. There are no runtime dependencies or API keys.

```sh
npm test
python3 -m http.server 8000
```

Visit `http://localhost:8000`. The root page is the app. The scheduling engine lives in `src/scheduler.js` and rejects overlaps, 15-minute violations, and must-do work that cannot fit. Each task needs one uninterrupted block. It never moves fixed or protected time.

## Status and submission

The [execution plan](V1_EXECUTION_PLAN.md) contains the product scope, acceptance criteria, and trial script. The [trial notes template](docs/USER_TRIALS.md) must be filled from actual target users; automated checks and the fictional sample are not user research. The [v2 plan template](docs/V2_PLAN.md) must be completed from those observations before class submission. Run `/security-review` in a client that supports it before shipping. No `.env` file is needed for this static app; the repository includes an agent deny rule and Git ignore rules for one if added later.

Vercel published the current version via CLI. Its GitHub auto-deploy connection was rejected by Vercel, so deploy later changes manually with `npx vercel deploy --prod` until that account integration is fixed.
