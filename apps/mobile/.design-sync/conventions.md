# CacciaParole conventions

CacciaParole is the design system of **Caccia alle Parole**, an Italian daily
word-game app (five games: parola del giorno, paroliere, anagrammi, impiccato,
caccia). Warm "tomato bold" language: tomato brand on cream surfaces, brown
inks, basil/amber reserved for gameplay feedback. All UI copy is **Italian**.

## How these components work

They are React Native components compiled with react-native-web. They style
themselves entirely through **props and inline styles — there is no CSS class
vocabulary**. Never pass `className` to them; never try to restyle them with
CSS selectors. No provider or wrapper is required: they render standalone and
follow the OS light/dark scheme automatically.

Components: `ThemedText`, `ThemedView` (app-shell primitives), `GameHeader`,
`OptionButton`, `StatPill`, `ResultModal`, `ResultStat`, `Confetti` (game kit),
`ArchiveAccessCard`, `DailyThemeCard` (daily challenge), `Balloon` (impiccato).
Exported constants carry the theme values as JS objects: `GamePalette`,
`GameSurfaces`, `GameRadius`, `GameShadow`, `GameFonts`, `Colors`, `Spacing`.

## Styling your own layout glue

For the layout you build around the components, use the shipped CSS custom
properties (defined in `styles.css`'s import closure) — they are the same
values as the JS constants:

- Surfaces: `--caccia-background` (cream page), `--caccia-card`,
  `--caccia-tile`, `--caccia-border`
- Text: `--caccia-text`, `--caccia-text-secondary`, `--caccia-text-tertiary`
- Brand: `--caccia-primary`, `--caccia-primary-dark`, `--caccia-on-primary`
- Feedback: `--caccia-success` (basil = correct), `--caccia-amber` (present),
  `--caccia-absent` (olive-gray), `--caccia-error`
- Radii: `--caccia-radius-sm|md|lg|tile|pill` · Spacing:
  `--caccia-space-half|1|2|3|4|5|6` (2/4/8/16/24/32/64px)
- Shadows: `--caccia-shadow-card|raised|subtle` (warm brown, never gray)
- Fonts: `--caccia-font-display` (Baloo2_700Bold — headings/buttons),
  `--caccia-font-display-semibold`, `--caccia-font-display-extrabold`,
  `--caccia-font-body` (Figtree_500Medium — body/labels),
  `--caccia-font-body-semibold`, `--caccia-font-body-bold`

Game screens sit on the cream page (`--caccia-background`), content in cards
(`--caccia-card`, radius `--caccia-radius-lg`, shadow `--caccia-shadow-card`).

## Where the truth lives

Read `styles.css` and its imports (tokens + `@font-face`) before styling, and
each component's `.d.ts` + `.prompt.md` for its exact API. Component visuals
come from the compiled bundle — the tokens above are for YOUR glue only.

## Example

```jsx
import { GameHeader, StatPill, OptionButton } from '@caccia/mobile';

export default function SetupSchermata() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--caccia-background)', padding: 'var(--caccia-space-3)' }}>
      <GameHeader title="Anagrammi" subtitle="Sfida del giorno" actionLabel="↺" onAction={() => {}} />
      <div style={{ display: 'flex', gap: 'var(--caccia-space-2)', margin: 'var(--caccia-space-3) 0' }}>
        <StatPill label="Punteggio" value={1240} tone="accent" />
        <StatPill label="Tempo" value="0:42" tone="warning" />
      </div>
      <div style={{ display: 'flex', gap: 'var(--caccia-space-2)', flexWrap: 'wrap' }}>
        <OptionButton label="Facile" active onPress={() => {}} />
        <OptionButton label="Difficile" onPress={() => {}} />
      </div>
    </div>
  );
}
```
