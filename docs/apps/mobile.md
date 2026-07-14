# Mobile App

`apps/mobile` is the forward product app for Caccia alle Parole.

## Commands

```bash
bun run dev:mobile
bun run ios
bun run android
bun run web:mobile
bun run lint:mobile
bun run test:mobile
bun run validate:daily-catalog
```

Run package-local Expo commands from `apps/mobile` when using Expo CLI directly.

```bash
bun run start
bun run ios
bun run android
```

## Structure

```text
src/app/          Expo Router routes
src/features/     Game, daily challenge, profile, stats, and notification logic
src/components/   Shared React Native components
src/lib/          Platform bridges and shared app utilities
assets/           App icons, splash assets, and store images
```
