# Parallel Days verification

## v2 usability follow-up · November 26, 2026

- Two desktop Chrome participant reports informed the follow-up. Both reported completing independently. A physical-phone trial remains open. [Trial notes](USER_TRIALS.md)
- On production at 390px and 1440px, fresh Chromium sessions exercised both reported scenarios with synthetic schedules. The fixed 7:00–7:30 PM commitment appeared above the cards in both options. The 4:20 → 5:05 PM scenario showed the previous start, the current start, and the portion outside the revised plan. Its 5- and 10-minute gaps and confirmed 5:05 PM axis were verified.
- The sample still fit its first two options on the first screen at 390px. The comparison screenshots below show the follow-up release. The other views were carried forward from the initial release. [Follow-up production deployment](https://vercel.com/darius-e0cc/project/B49QXy8qRYop7SnrTuy2qafECYkt)

## v2 · November 26, 2026

- `npm test` passed 11 scheduler tests. Coverage includes a single 20-minute task, a 10-minute protected block, exact open intervals, window clipping, completed tasks, infeasible must-do work, and zero open time.
- A fresh Chromium context at both widths completed the live personal and sample flows. The checks covered a past-start repair, a saved personal plan surviving refresh, sample isolation, keyboard option selection, a fixed class retaining its position, and last-change details.
- The sample's 45-minute delay changed available time from 210 to 165 minutes. The three options showed total and longest open time of 30/30, 60/30, and 120/90 minutes. The reading option listed 15:30–16:00 and 17:30–18:00.
- Browser checks covered legacy v1 restore, a mismatched saved record, simultaneous confirmations from two tabs, storage failure and retry, and a draft confirmed after midnight. See the [security pass](SECURITY_REVIEW.md).
- The initial v2 deployment matched application commit `a568518` byte-for-byte across all five runtime files. Course materials, the security report, agent settings, dotenv and Git metadata returned 404. [Initial production deployment](https://vercel.com/darius-e0cc/project/CvgFdS4WeAdM43c2e8EqNVXXEASM)

| View | 390px | 1440px |
| --- | --- | --- |
| Home | [Phone](screenshots/v2/home-390.png) | [Desktop](screenshots/v2/home-1440.png) |
| Task entry | [Phone](screenshots/v2/entry-390.png) | [Desktop](screenshots/v2/entry-1440.png) |
| Compare after a 45-minute delay | [Phone](screenshots/v2/compare-390.png) | [Desktop](screenshots/v2/compare-1440.png) |
| Confirmed with last change | [Phone](screenshots/v2/confirmed-390.png) | [Desktop](screenshots/v2/confirmed-1440.png) |

## v1 · November 17, 2026

- `npm test`: nine scheduler tests passed, including a 45-minute delay, distinct alternatives, must-do infeasibility and priority, protected-time conflict, completed-task exclusion, past-block removal, continuous-block shortage, 15-minute input validation, and title length validation.
- `node --check src/main.js` and `node --check src/scheduler.js`: passed.
- Local HTTP server: root HTML and `src/main.js` returned 200.
- GitHub push: commit `58ff486` went to `DarryDarius/design-build-ship_project` on `main`. A follow-up fix may have a later commit.
- Vercel CLI production deployment: ready; `https://project-darius-e0cc.vercel.app/` returned public HTTP 200 and the Parallel Days app title after SSO protection was disabled for this public prototype.
- Native Edge browser walkthrough on the public site verified the fictional sample, three distinct choice cards, choosing a different option, confirmation, reload persistence, and replanning after moving the start time and marking a task actually finished. A 390×844 responsive preview was visually checked for the confirmed view, editable task form, and comparison cards; no horizontal overflow was observed. An own-data path with two tasks reached feasible options. A later public-deployment check verified that a new-day draft says the previous plan remains saved without falsely comparing unrelated tasks, and that must-do work is named as common to every option.
- Vercel's GitHub auto-deploy connection failed despite a successful Git push. The current site was deployed with the CLI; future changes require `npx vercel deploy --prod` until the connection is resolved.
- One user-supplied real desktop trial report is recorded in `docs/USER_TRIALS.md`. The v2 plan is evidence-based but provisional until more target users and a real phone are tested. The sample day and automated tests are not user evidence.
- Vercel account `darius-e0cc` reports the Hobby plan. The app has no paid API or model calls.

## Post-trial follow-up — 2026-11-17

- `node --check src/main.js`, `npm test`, and `git diff --check` passed. All nine scheduler tests remain green.
- Headless Chrome walkthrough of the local site verified three sample options, required tasks named on every card, confirmation, **Something changed → 45 min** going directly to new choices, the old confirmed plan surviving refresh before reconfirmation, finished-task shortcut, and **+ Add a task** creating and focusing a new row.
- The 45-minute sample delay left 75 total open minutes after the must-do task and class. A 390-pixel browser viewport had no horizontal overflow. Desktop comparison and mobile quick-panel screenshots were visually inspected.
- Remaining product work: show exact open intervals, persist completion status independently on the confirmed view, and support splittable tasks. A responsive browser preview does not replace a participant's phone trial.
