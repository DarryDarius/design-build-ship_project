# Parallel Days v2 security pass

Reviewed November 26, 2026. The app is static and stores personal plans in the current browser. The review covered the HTML, JavaScript, scheduler tests, and repository and deployment exclusions. API authentication, Supabase policies, and model limits are outside the deployed architecture.

A fresh, read-only Codex CLI session reviewed the code in an isolated snapshot. The implementation session checked the findings and verified the fixes in Chromium.

| Finding | Fix and verification |
| --- | --- |
| **Medium · Stored schedule and task input could disagree.** A previously written record could render mismatched task blocks. | On restore, rebuild valid choices and check the selected task IDs, task details, block bounds, overlaps, and fixed commitments. Accept the original placement when valid and derive summary metrics from that placement. A browser check restored a v1 record, then verified that a mismatched record produced a visible recovery message. The stored record stays in place until the user explicitly confirms a replacement. |
| **Medium · Two tabs could race to replace the same plan.** | Serialize personal writes using Web Locks, then check the stored revision inside the lock. In the two-tab browser check, one confirmation succeeded and the other showed a reload message. Browsers without Web Locks use the revision check alone, which retains a narrow simultaneous-write race. [Web Locks specification](https://w3c.github.io/web-locks/) |
| **Low · A malformed sample flag could select the wrong mode.** | Validate the flag on restore and keep sample confirmations in memory. The browser walkthrough verified that confirming and revising the sample left personal storage byte-for-byte unchanged. |
| **Low · Review output could be exposed if stored in the deployment root.** | The isolated review output stayed in a temporary directory outside the repository. The handoff lives under excluded `docs/`. Added `project_v2/` and dotenv patterns to deployment exclusions. |

## Additional checks

- User-entered titles and messages use DOM text nodes or input values. The app renders the timeline from validated minute ranges and recognized block types.
- A rejected storage write kept the original personal record and the current draft. Retrying after storage returned succeeded.
- Git ignores dotenv files, and the project includes a Claude Code deny rule for reading them. The deployed app requires no credentials or environment variables. HTTP checks on production returned 404 for the course materials, this report, agent settings, the dotenv path, and Git configuration.
- Personal information remains in local storage for this browser and origin. Anyone sharing the same browser profile can see its saved plan. Clearing the site's storage removes it.
