# Verification — 2026-11-17

- `npm test`: nine scheduler tests passed, including a 45-minute delay, distinct alternatives, must-do infeasibility and priority, protected-time conflict, completed-task exclusion, past-block removal, continuous-block shortage, 15-minute input validation, and title length validation.
- `node --check src/main.js` and `node --check src/scheduler.js`: passed.
- Local HTTP server: root HTML and `src/main.js` returned 200.
- GitHub push: commit `58ff486` went to `DarryDarius/design-build-ship_project` on `main`. A follow-up fix may have a later commit.
- Vercel CLI production deployment: ready; `https://project-darius-e0cc.vercel.app/` returned public HTTP 200 and the Parallel Days app title after SSO protection was disabled for this public prototype.
- Native Edge browser walkthrough on the public site verified the fictional sample, three distinct choice cards, choosing a different option, confirmation, reload persistence, and replanning after moving the start time and marking a task actually finished. A 390×844 responsive preview was visually checked for the confirmed view, editable task form, and comparison cards; no horizontal overflow was observed. An own-data path with two tasks reached feasible options. A later public-deployment check verified that a new-day draft says the previous plan remains saved without falsely comparing unrelated tasks, and that must-do work is named as common to every option.
- Vercel's GitHub auto-deploy connection failed despite a successful Git push. The current site was deployed with the CLI; future changes require `npx vercel deploy --prod` until the connection is resolved.
- Real-user trials and an evidence-based v2 plan are pending. The sample day and automated tests are not user evidence.
- Vercel account `darius-e0cc` reports the Hobby plan. The app has no paid API or model calls.
