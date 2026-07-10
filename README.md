# Caccia alle Parole

Expo-forward monorepo for the Italian word-game app.

## Repository Layout

```text
apps/
  mobile/              Expo app for iOS, Android, and mobile web
  web/                 Legacy SvelteKit web app, preserved for reference and web deploys
  workers/
    push-api/          Cloudflare Worker for push notification APIs
docs/                  Deployment notes, roadmap, design system, and migration plans
README.md              Monorepo entrypoint
```

## Package Manager

Use Bun from the repository root:

```bash
bun install
```

The root package is a workspace control plane. App dependencies and local scripts live in each app package.

## Common Commands

```bash
bun run dev              # Expo app
bun run dev:mobile       # Expo app
bun run ios              # Expo iOS build/run
bun run android          # Expo Android build/run
bun run web:mobile       # Expo web runtime

bun run dev:web          # Legacy SvelteKit app
bun run build:web        # Legacy SvelteKit build

bun run dev:push-api     # Push API Worker
bun run deploy:push-api  # Deploy push API Worker
```

## Verification

```bash
bun run lint:mobile
bun run test:mobile
bun run validate:daily-catalog
bun run build:web
```

## Docs

- [Deployment](docs/DEPLOY.md)
- [Roadmap](docs/ROADMAP.md)
- [Mobile app](docs/apps/mobile.md)
- [Design system](docs/cds/README.md)
- [Migration plans](docs/plans/migration/README.md)

## App Ownership

`apps/mobile` is the forward development target. Keep reusable game logic in the Expo app unless a second active app needs it. `apps/web` exists to preserve the previous SvelteKit implementation and deployment path while mobile becomes the primary product.
