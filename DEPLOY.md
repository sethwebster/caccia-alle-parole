# Deploying to Cloudflare Workers

This guide explains how to deploy a SvelteKit app to Cloudflare Workers with static assets.

## Quick Summary

Cloudflare merged Pages and Workers into one thing. Now everything is a "Worker" that can also serve static files. Think of it like a smart server that can both run code AND serve your CSS/images/HTML.

---

## How It Works (The Simple Version)

1. **You write code** - SvelteKit app with pages, components, etc.
2. **You build it** - `bun run build` creates two things:
   - A "worker" file (`_worker.js`) - the brain that handles requests
   - Static files (CSS, JS, images) - the stuff browsers download
3. **Cloudflare serves it** - Worker handles dynamic stuff, static files get served directly

---

## Project Configuration

### wrangler.toml (The Config File)

This tells Cloudflare how to run your app:

```toml
name = "caccia-parole"                    # Your project name on Cloudflare
compatibility_date = "2025-01-01"         # Which Cloudflare features to use
compatibility_flags = ["nodejs_compat"]   # Enable Node.js APIs

main = ".svelte-kit/cloudflare/_worker.js"  # The worker code entry point

[assets]
directory = ".svelte-kit/cloudflare"      # Where static files live
binding = "ASSETS"                        # Name used to access files in code
```

### svelte.config.js (SvelteKit Config)

Uses the Cloudflare adapter to generate the right output:

```javascript
import adapter from '@sveltejs/adapter-cloudflare';

const config = {
  kit: {
    adapter: adapter()
  }
};
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "vite dev",              // Local development
    "build": "vite build",          // Build for production
    "cf:dev": "wrangler dev",       // Test with Cloudflare locally
    "cf:deploy": "bun run build && wrangler deploy"  // Deploy to Cloudflare
  }
}
```

---

## Setting Up From Scratch

### Step 1: Install Wrangler

Wrangler is Cloudflare's CLI tool:

```bash
bun add -D wrangler
# or: npm install -D wrangler
```

### Step 2: Login to Cloudflare

```bash
bunx wrangler login
```

This opens a browser. Click "Allow" to authorize.

### Step 3: Create wrangler.toml

Create a file named `wrangler.toml` in your project root:

```toml
name = "your-project-name"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
main = ".svelte-kit/cloudflare/_worker.js"

[assets]
directory = ".svelte-kit/cloudflare"
binding = "ASSETS"
```

### Step 4: Build and Deploy

```bash
bun run build
bunx wrangler deploy
```

Your app is now live at: `https://your-project-name.your-subdomain.workers.dev`

---

## Connecting GitHub for Automatic Deploys

### Option A: Cloudflare Dashboard (Recommended)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click **Workers & Pages** in the left sidebar
3. Click **Create**
4. Select **Import from Git**
5. Connect your GitHub account (if not already)
6. Select your repository
7. Configure build settings:
   - **Build command**: `bun run build`
   - **Build output directory**: `.svelte-kit/cloudflare`
8. Click **Deploy**

Now every push to `main` triggers a new deployment.

### Option B: GitHub Actions (Manual Setup)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install
      - run: bun run build

      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

Add `CLOUDFLARE_API_TOKEN` to your GitHub repo secrets:
1. Cloudflare Dashboard > My Profile > API Tokens
2. Create Token > Use "Edit Cloudflare Workers" template
3. Copy token to GitHub: Settings > Secrets > Actions

---

## What Cloudflare Runs Automatically

When you connect your repo to Cloudflare Dashboard:

| Step | Automatic? | What Happens |
|------|------------|--------------|
| Clone repo | Yes | Cloudflare pulls your code |
| Install deps | Yes | Runs `bun install` or `npm install` |
| Build | Yes | Runs your build command |
| Deploy worker | Yes | Uploads `_worker.js` |
| Deploy assets | Yes | Uploads static files |
| Assign URL | Yes | Makes it live at `*.workers.dev` |

You do NOT need to:
- Run `wrangler deploy` manually
- Set up CI/CD pipelines (unless you want GitHub Actions)
- Upload files yourself

---

## Manual Deployment Commands

When NOT using automatic GitHub integration:

```bash
# Build the project
bun run build

# Deploy to Cloudflare
bunx wrangler deploy

# Or use the combined script
bun run cf:deploy
```

---

## Local Development

### Standard Vite Dev Server

```bash
bun run dev
```

Fast, uses Vite. No Cloudflare-specific features.

### Cloudflare Local Emulation

```bash
bun run cf:dev
```

Slower, but emulates Cloudflare environment (KV, D1, etc.).

Use `cf:dev` when:
- Testing Cloudflare-specific bindings
- Debugging production-like behavior
- Using Cloudflare KV, D1, or other services

---

## Custom Domain Setup

### Using Cloudflare DNS (Simple)

1. Add your domain to Cloudflare
2. Workers & Pages > Your project > Settings > Domains
3. Click "Add Domain"
4. Enter your domain
5. Cloudflare handles DNS automatically

### Using External DNS

Your domain's nameservers MUST be Cloudflare's. Workers don't support external DNS.

If you can't switch nameservers, use a subdomain:
1. Add a CNAME record: `app.yourdomain.com` -> `your-project.workers.dev`
2. This won't work directly; you need Cloudflare nameservers

---

## Troubleshooting

### "No worker script found"

**Problem**: Cloudflare can't find `_worker.js`

**Solution**: Make sure `main` in `wrangler.toml` points to the right file:
```toml
main = ".svelte-kit/cloudflare/_worker.js"
```

And run `bun run build` before deploying.

### "ASSETS binding not found"

**Problem**: Worker code tries to use `env.ASSETS` but it's not configured

**Solution**: Add the binding to `wrangler.toml`:
```toml
[assets]
directory = ".svelte-kit/cloudflare"
binding = "ASSETS"
```

### Build works locally but fails on Cloudflare

**Problem**: Cloudflare's build environment differs from yours

**Solutions**:
1. Check Node version - Cloudflare defaults vary
2. Set build environment variables in Dashboard
3. Try adding to your build command: `NODE_VERSION=20 bun run build`

### Static assets 404

**Problem**: CSS/JS files return 404

**Solutions**:
1. Check `[assets] directory` matches your build output
2. Verify files exist in `.svelte-kit/cloudflare` after build
3. Check `.assetsignore` isn't excluding needed files

### "Worker exceeded CPU time limit"

**Problem**: Your worker code takes too long

**Solutions**:
1. Move heavy computation off the critical path
2. Use caching
3. Split into smaller functions
4. Consider Cloudflare paid plan for higher limits

### Preview deployments not working

**Problem**: PR previews don't deploy

**Solution**: Enable preview URLs in `wrangler.toml`:
```toml
preview_urls = true
```

And in Dashboard: Your project > Settings > Enable preview deployments

---

## Environment Variables

### In wrangler.toml (non-secret)

```toml
[vars]
PUBLIC_API_URL = "https://api.example.com"
```

### Secrets (API keys, etc.)

```bash
bunx wrangler secret put MY_SECRET
# Enter value when prompted
```

Or in Dashboard: Workers & Pages > Your project > Settings > Variables

### Accessing in Code

```javascript
// In SvelteKit +page.server.js or +server.js
export async function load({ platform }) {
  const apiKey = platform.env.MY_SECRET;
  // ...
}
```

---

## Architecture Overview

```
Your Code (SvelteKit)
        |
        v
   vite build
        |
        v
.svelte-kit/cloudflare/
    |-- _worker.js      <-- Server-side logic
    |-- _app/           <-- Client JS bundles
    |-- fonts/          <-- Static assets
    |-- etc.

        |
        v
   wrangler deploy
        |
        v
Cloudflare Edge (200+ locations worldwide)
    |
    |-- Request comes in
    |-- Is it a static file? --> Serve from cache
    |-- Is it dynamic? --> Run _worker.js
    |-- Return response
```

---

## Key Differences: Old Pages vs New Workers

| Feature | Old Pages | New Workers (Current) |
|---------|-----------|----------------------|
| Config file | `pages_build_output_dir` | `[assets] directory` |
| Dev command | `wrangler pages dev` | `wrangler dev` |
| Deploy command | `wrangler pages deploy` | `wrangler deploy` |
| Dev port | 8788 | 8787 |
| Worker entry | Auto-detected | `main` field required |

---

## Files You'll See After Build

```
.svelte-kit/cloudflare/
    _worker.js        # The worker code (runs on Cloudflare)
    _routes.json      # Route configuration
    _headers          # HTTP headers for static files
    .assetsignore     # Files to exclude from upload
    _app/             # SvelteKit client bundles
    fonts/            # Static assets
    404.html          # Not found page
```

---

## Useful Commands

```bash
# Check worker logs
bunx wrangler tail

# List deployments
bunx wrangler deployments list

# Rollback to previous deployment
bunx wrangler rollback

# Delete the worker
bunx wrangler delete
```

---

## Getting Help

- Cloudflare Discord: https://discord.gg/cloudflaredev
- Cloudflare Docs: https://developers.cloudflare.com/workers/
- SvelteKit Docs: https://svelte.dev/docs/kit/adapter-cloudflare
