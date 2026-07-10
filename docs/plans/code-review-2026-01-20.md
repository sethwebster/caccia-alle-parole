# Code Review: Cloudflare Pages 404 on Dynamic Routes

**Date:** 2026-01-20
**Issue:** Production returns 404 for `/parola` and `/caccia` while build succeeds locally

## Root Cause Analysis

### The Problem

The `wrangler.toml` is missing the `nodejs_compat` compatibility flag. SvelteKit's server-side code uses Node.js APIs (`node:async_hooks`, `node:crypto`) that require this flag to work on Cloudflare Workers/Pages.

**Evidence:**
- Local `wrangler pages dev` shows warnings: "The package 'node:async_hooks' wasn't found... Your Worker may throw errors at runtime unless you enable the 'nodejs_compat' compatibility flag"
- Despite warnings, local test returns 200 (wrangler dev is more lenient)
- Production returns 404 because the worker fails to initialize without proper Node.js polyfills

### Configuration Analysis

**Current `wrangler.toml`:**
```toml
name = "caccia-parole"
compatibility_date = "2025-01-01"
pages_build_output_dir = ".svelte-kit/cloudflare"
```

**Missing:**
- `compatibility_flags = ["nodejs_compat"]`

---

## Critical Issues

### 1. Missing `nodejs_compat` Flag
**Location:** `/wrangler.toml`
**Problem:** SvelteKit uses `node:async_hooks` and `node:crypto` internally for SSR. Without `nodejs_compat`, these APIs are unavailable.
**Impact:** Worker fails at runtime, Pages falls back to 404.html
**Solution:** Add `compatibility_flags = ["nodejs_compat"]`

---

## Architecture Observations

### SvelteKit + Cloudflare Pages Flow

1. `vite build` generates SSR server code in `.svelte-kit/output/server/`
2. `adapter-cloudflare` creates `.svelte-kit/cloudflare/_worker.js` with imports:
   - `../output/server/index.js` (server code)
   - `../cloudflare-tmp/manifest.js` (route manifest)
3. Cloudflare Pages **bundles** `_worker.js` at deploy time (via internal wrangler/esbuild)
4. Bundled worker handles SSR requests

### Why Root `/` Works But `/parola` Doesn't

The root `/` returns client-side rendered HTML shell (from cached/prerendered response or fallback).
Dynamic routes like `/parola` require the SSR worker to generate content.
If the worker crashes due to missing Node.js APIs, Pages serves 404.

---

## Verification

### Local Test (Successful)
```bash
npx wrangler pages dev .svelte-kit/cloudflare --port 8788
curl http://localhost:8788/parola  # Returns 200
```

### Production Test (Failed)
```bash
curl https://cacciaparole.com/parola  # Returns 404
curl https://cacciaparole.com/  # Returns HTML shell (client-side only)
```

---

## Fix

### Update `wrangler.toml`:

```toml
name = "caccia-parole"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".svelte-kit/cloudflare"
```

---

## Additional Notes

### Stale Deployment

Production is running an old build (different JS file hashes):
- Production: `start.C3RcqTJ3.js`
- Local: `start.6CxJXoCu.js`

After fixing wrangler.toml, a fresh deployment should resolve the issue.

### Build Output Structure

The adapter correctly generates:
- `_worker.js` - SSR handler (with external imports, bundled by CF)
- `_routes.json` - Routes all paths to worker except static assets
- `_app/` - Client-side assets
- `fonts/` - Static font files

---

## Sources

- [Cloudflare Pages Wrangler Configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Cloudflare nodejs_compat Flag](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [SvelteKit adapter-cloudflare](https://svelte.dev/docs/kit/adapter-cloudflare)
- [Advanced Mode _worker.js](https://developers.cloudflare.com/pages/functions/advanced-mode/)
