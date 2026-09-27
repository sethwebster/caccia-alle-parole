# TestFlight crash investigations

`TestFlight crash fixes` polls App Store Connect every 30 minutes and supports manual dispatch. It fetches every page of this app's beta crash feedback and crash logs, groups reports by a normalized native stack, and creates or updates a GitHub issue. Tester comments, email addresses, identifiers, raw crash logs, and credentials are not uploaded. Sanitized technical summaries are retained as Actions artifacts for seven days.

Required repository secrets: `ASC_CRASH_KEY_ID`, `ASC_CRASH_ISSUER_ID`, `ASC_CRASH_PRIVATE_KEY`, and `CLAUDE_CODE_OAUTH_TOKEN`. The Apple key must be allowed to read the app's beta crash feedback. It is exposed only to the collector, never the investigation agent. The existing EAS submission key was verified against the reporting endpoints when this workflow was installed.

Each new signature gets at most one automatic investigation, with at most two investigations per run. The agent must reproduce the exact failure before editing application code. Independent mobile tests, TypeScript, and lint must pass before the publisher can create a **draft** fix PR. The agent's job has read-only repository access; a separate publisher job creates the branch and PR. It cannot automatically merge, close a crash issue, or deploy. Native failures still require a Release simulator/device replay before a reviewer marks the PR ready.

If Apple omits a JavaScript exception message, an RCTFatal stack alone is insufficient to choose a fix. The investigator should leave a diagnosis/missing-evidence comment instead of guessing. Newly published feedback without a crash log is retried on the next poll. A new report for a closed signature reopens the issue.

To retry after adding evidence, manually dispatch with `retry_issue` set to its issue number, or add `testflight-fix-requested`. Failed runs retain an attempted label so they cannot create an expensive retry loop. Inspect the Actions run before retrying. `dry_run: true` pulls/sanitizes reports without creating issues or invoking the agent.

Local checks:

```sh
node --test scripts/testflight/*.test.mjs
actionlint .github/workflows/testflight-crashes.yml
```

The collector can also run locally with the three `ASC_*` variables expected in `poll.mjs`, `DRY_RUN=true`, and `ASC_APP_ID=6788523009`. Never commit keys or raw crash reports.

Apple API references:
- https://developer.apple.com/documentation/appstoreconnectapi/get-v1-apps-_id_-betafeedbackcrashsubmissions
- https://developer.apple.com/documentation/appstoreconnectapi/get-v1-betafeedbackcrashsubmissions-_id_-crashlog
