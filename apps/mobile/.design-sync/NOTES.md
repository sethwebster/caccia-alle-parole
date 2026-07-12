# design-sync notes — @caccia/mobile → CacciaParole

Repo-specific gotchas for re-syncs. The DS source is the **mobile Expo app**
(user's choice), not the web app's CDS css system.

- **No dist, no library**: this is an app. The bundle entry is the hand-curated
  `.design-sync/ds-entry.ts` (components + theme constants + `<Name>Props`
  aliases). Adding a component to the DS = add it to `ds-entry.ts` AND
  `componentSrcMap` in config.json.
- **`.d.ts` tree is generated**: `buildCmd` (`bunx tsc -p
  .design-sync/tsconfig.types.json`) emits declarations into gitignored
  `types/` — `findTypesRoot` picks `types/` up as the types root. Run it before
  the converter on a fresh clone or after component API changes.
- **react-native → react-native-web** via `.design-sync/tsconfig.dsync.json`
  paths (read by the converter's esbuild plugin). `react-native-svg` is pinned
  to its web build; `expo-router` is stubbed
  (`.design-sync/stubs/expo-router.ts`) — GameHeader/ArchiveAccessCard only
  call `useRouter()` for navigation side effects.
- **`overrides/bundle.mjs` fork** (declared in `libOverrides`): adds metro-style
  web-first `resolveExtensions` (reanimated/svg ship `.web.js` variants) and
  defines for `__DEV__`, `global`, `process.env.NODE_DEBUG`,
  `process.env.JEST_WORKER_ID`. On re-sync, diff against the bundled
  `lib/bundle.mjs` and merge upstream changes. Needs the
  `.design-sync/node_modules → ../.ds-sync/node_modules` symlink on fresh clones.
- **RNW stylesheet vs render check**: react-native-web injects
  `<style id="react-native-stylesheet">` filled via CSSOM (empty innerHTML);
  the validator's `[id^="r"]` mount-root scan matched it and misread pages as
  empty. `ds-entry.ts` strips that id after import — don't remove that block.
- **Playwright**: browsers cached at `~/Library/Caches/ms-playwright`
  (chromium-1223) — playwright@1.60.0 pins that build; installed into `.ds-sync/`.
- **Fonts**: Baloo 2 + Figtree ship from `@expo-google-fonts/*` packages via
  `extraFonts` css (`.design-sync/fonts/caccia-fonts.css`). Family names are the
  RN per-weight names (`Baloo2_700Bold` etc.) — must match `GameFonts` strings.
- **Tokens css is hand-derived** (`.design-sync/tokens/caccia-tokens.css`,
  wired via `cssEntry` → appended to `_ds_bundle.css`; `tokensGlob` does NOT
  work for in-repo files — it requires `tokensPkg`). If
  `src/constants/game-theme.ts` or `theme.ts` values change, update this file
  by hand.
- **Excluded components**: `Collapsible` (expo-symbols SymbolView is iOS-only),
  `GameBoard`/screens (service/gesture-coupled), widgets.

- **Reanimated worklets**: the bundle compiles without the worklets babel
  plugin, so `useAnimatedStyle(fn)` (no dep array) throws on web. `ds-entry.ts`
  defines a non-enumerable `Function.prototype.__closure` to defuse the guard —
  initial (mount-state) styles render exactly; animation frames don't advance
  (correct for static design renders). Affected: Balloon (statics exact),
  Confetti (kept as floor card — pieces freeze at t=0 into a blob; also
  `package-capture` pins the page clock, so mid-flight captures are impossible).
- **`types/.design-sync/` is invisible to the d.ts scan** (fast-glob skips dot
  dirs) — `buildCmd` copies `ds-entry.d.ts` to `types/ds-entry.d.ts` with
  `../src/` rewritten to `./src/`; without that copy every file-local-Props
  component emits a stub `[key: string]: unknown` contract.
- **Upstream component bugs found while previewing** (not DS issues):
  `ThemedView` destructures `lightColor`/`darkColor` but never applies them
  (dead props); `ResultStat` draws its bottom hairline on the last row too.
- DailyThemeCard's `model` prop structurally needs only `{ challengeId, theme }`.

## Known render warns

- `[RENDER_THIN] ResultModal — rendered height 0px`: RN Modal portals to
  `document.body`; the cell measures 0 but the screenshot shows the full modal.
  Benign. Card runs `cardMode: single`, `primaryStory: Vittoria`.
- `[FONT_MISSING] "SF Pro Rounded" / "Hiragino Maru Gothic ProN"`: OS-provided
  fallback stacks from the Expo template's `src/global.css` (`--font-rounded`),
  never shipped by anyone; suppressed via `runtimeFontPrefixes`.

## Re-sync risks

- `caccia-tokens.css` and `caccia-fonts.css` are hand-maintained copies of TS
  constants / font file paths — they silently rot if `game-theme.ts`,
  `theme.ts`, or the `@expo-google-fonts` package layout changes.
- `ds-entry.ts` + `componentSrcMap` are a manual component roster — a new
  reusable component in the app won't appear until added to both.
- The `bundle.mjs` fork pins converter behavior; upstream converter updates
  must be merged into `.design-sync/overrides/bundle.mjs` by hand.
- `types/` is gitignored — `buildCmd` must run before the converter or `.d.ts`
  extraction quietly degrades (empty props bodies).
- Reanimated entering animations run on mount; captures are taken after
  networkidle so they've settled. If future components animate indefinitely,
  screenshots may vary.
