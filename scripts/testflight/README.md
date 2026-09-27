# TestFlight crash investigations

`TestFlight crash fixes` runs when Apple sends a `BETA_FEEDBACK_CRASH_SUBMISSION_CREATED` webhook, with daily reconciliation at 09:17 UTC and manual dispatch as fallbacks. It fetches every page of this app's beta crash feedback and crash logs, groups reports by a normalized native stack, and creates or updates a GitHub issue. Tester comments, email addresses, identifiers, raw crash logs, and credentials are not uploaded. Sanitized technical summaries are retained as Actions artifacts for seven days.

## Webhook receiver

Apple posts to `https://caccia-testflight-webhook.sethwebster.workers.dev/testflight`. The Cloudflare Worker in `receiver.mjs` verifies `x-apple-signature` against the exact request bytes with HMAC-SHA256, limits bodies to 64 KiB, and dispatches only this repository's `testflight-crashes.yml` on `main`. It ignores non-crash events (including Apple's test pings), rejects malformed crash events, and returns 503 if GitHub does not accept the dispatch. It never follows payload links or forwards payload content to GitHub. Logs contain only dispatch status, not headers or request bodies.

The receiver has two encrypted Wrangler secrets: `APPLE_WEBHOOK_SECRET` (also registered with Apple) and `GITHUB_DISPATCH_TOKEN`. The latter was provisioned from the existing `dougbot-agent` automation account, which has write access to this repository and no repository admin access. For future token rotation, a fine-grained token restricted to this repository with Actions write is sufficient. Revoking the bot's current GitHub authorization also requires replacing this Worker secret. Apple API credentials remain exclusively in the collector.

Apple webhook ID: `a6a51efd-7881-42b8-9d04-2eea47df34f3`, app `6788523009`. Configure or test it in App Store Connect → Users and Access → Integrations → Webhooks. The event subscription is only crash feedback creation. New configuration should use a random secret stored through `wrangler secret bulk` via stdin; never put secrets in command arguments or this file.

Deploy from the repository root with the existing installed Wrangler:

```sh
apps/workers/push-api/node_modules/.bin/wrangler deploy --config scripts/testflight/wrangler.jsonc
```

Delivery is at least once from the application's perspective: repeat notifications can dispatch repeat collection runs, but the collector's signature reservation prevents repeat automatic investigations. Every dispatch scans the whole app, so GitHub concurrency coalescing does not lose individual reports. Apple processing delays, reports without an available crash log, or failed webhook delivery can still defer investigation until the daily reconciliation. This is reactive to Apple creating crash feedback, not an on-device crash SDK.

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
