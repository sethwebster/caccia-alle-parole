# SvelteKit + Cloudflare Migration Plan

## Overview
Migrate vanilla JS word game app to SvelteKit SSG on Cloudflare Pages while preserving all functionality.

---

## Architecture Changes

### From
- Vanilla JS ES6 modules
- Client-side routing (hash-based)
- Class-based components
- localStorage only
- Cloudflare Workers (static assets)

### To
- SvelteKit SSG (static site generation)
- File-based routing
- Svelte components
- localStorage + potential KV storage
- Cloudflare Pages (optimized static hosting)

---

## Phase 1: Project Setup

### 1.1 Initialize SvelteKit Project
```bash
npm create svelte@latest
# Choose: Skeleton project, TypeScript (optional), ESLint, Prettier
```

**Config:**
```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    })
  }
};
```

**Dependencies:**
```json
{
  "dependencies": {
    "@sveltejs/adapter-cloudflare": "^4.0.0"
  },
  "devDependencies": {
    "@sveltejs/kit": "^2.0.0",
    "svelte": "^4.0.0",
    "vite": "^5.0.0"
  }
}
```

### 1.2 Cloudflare Pages Setup
```bash
# Create Cloudflare Pages project
npx wrangler pages project create caccia-parole

# Configure build settings
Build command: npm run build
Build output directory: .svelte-kit/cloudflare
```

**wrangler.toml updates:**
```toml
name = "caccia-parole"
compatibility_date = "2025-01-17"
pages_build_output_dir = ".svelte-kit/cloudflare"

[env.production]
routes = [
  { pattern = "/*", zone_name = "your-domain.com" }
]
```

---

## Phase 2: Route Structure

### 2.1 File-Based Routes
```
src/
├── routes/
│   ├── +page.svelte              # Mode selector (home)
│   ├── +layout.svelte            # Root layout
│   ├── caccia/
│   │   └── +page.svelte          # Word search game
│   └── parola/
│       └── +page.svelte          # Wordle game
├── lib/
│   ├── components/
│   │   ├── ModeSelector.svelte
│   │   ├── WordSearchGame.svelte
│   │   ├── WordleGame.svelte
│   │   ├── GameBoard.svelte
│   │   ├── Keyboard.svelte
│   │   ├── Modal.svelte
│   │   └── CategorySelector.svelte
│   ├── stores/
│   │   ├── wordSearch.ts
│   │   └── wordle.ts
│   ├── data/
│   │   ├── word-data.ts          # Word categories
│   │   ├── wordle-data.ts        # Daily puzzles
│   │   └── wordle-valid-words.ts
│   ├── utils/
│   │   ├── gridGenerator.ts
│   │   ├── wordDetection.ts
│   │   └── wordleLogic.ts
│   └── styles/
│       ├── tokens/               # CSS custom props
│       └── components/           # Component styles
└── app.html                      # HTML template
```

**Routing mapping:**
- `/` → Mode selector (no hash)
- `/caccia` → Word search game (#caccia)
- `/parola` → Wordle game (#parola)

### 2.2 Layout Component
```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import '../lib/styles/tokens/colors.css';
  import '../lib/styles/tokens/typography.css';
  import '../lib/styles/tokens/spacing.css';
  import '../lib/styles/components/buttons.css';
  import '../lib/styles/components/modals.css';
  // ... other CDS imports
</script>

<div class="app">
  <slot />
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Poppins', sans-serif;
  }
</style>
```

---

## Phase 3: Component Migration

### 3.1 GameManager → Root Layout + Navigation
**Current:** `game.js` class managing mode selection
**New:** Svelte layout + navigation component

```svelte
<!-- src/lib/components/Navigation.svelte -->
<script>
  import { page } from '$app/stores';

  $: currentPath = $page.url.pathname;
</script>

<nav class="nav">
  <a href="/" class:active={currentPath === '/'}>Home</a>
  <a href="/caccia" class:active={currentPath === '/caccia'}>Caccia</a>
  <a href="/parola" class:active={currentPath === '/parola'}>Paròla</a>
</nav>
```

### 3.2 WordSearchGame → Svelte Component
**Current:** `WordSearchGame` class (game.js lines 60-320)
**New:** `src/lib/components/WordSearchGame.svelte`

**State management:**
```typescript
// src/lib/stores/wordSearch.ts
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface GameState {
  category: string | null;
  difficulty: string | null;
  words: Array<Word>;
  foundWords: Set<string>;
  score: number;
  gridSize: number;
}

function createGameStore() {
  const initialState = browser
    ? JSON.parse(localStorage.getItem('wordSearchGameState') || '{}')
    : {};

  const store = writable<GameState>(initialState);

  // Auto-save to localStorage
  if (browser) {
    store.subscribe(state => {
      localStorage.setItem('wordSearchGameState', JSON.stringify(state));
    });
  }

  return {
    subscribe: store.subscribe,
    setCategory: (category: string) => store.update(s => ({ ...s, category })),
    setDifficulty: (difficulty: string) => store.update(s => ({ ...s, difficulty })),
    foundWord: (word: string, points: number) => store.update(s => ({
      ...s,
      foundWords: s.foundWords.add(word),
      score: s.score + points
    })),
    reset: () => store.set({
      category: null,
      difficulty: null,
      words: [],
      foundWords: new Set(),
      score: 0,
      gridSize: 0
    })
  };
}

export const gameState = createGameStore();
```

**Component structure:**
```svelte
<!-- src/lib/components/WordSearchGame.svelte -->
<script lang="ts">
  import { gameState } from '$lib/stores/wordSearch';
  import CategorySelector from './CategorySelector.svelte';
  import GameBoard from './GameBoard.svelte';
  import Modal from './Modal.svelte';

  let showVictoryModal = false;

  $: allWordsFound = $gameState.foundWords.size === $gameState.words.length;
  $: if (allWordsFound) showVictoryModal = true;
</script>

{#if !$gameState.category}
  <CategorySelector on:select={(e) => gameState.setCategory(e.detail)} />
{:else if !$gameState.difficulty}
  <DifficultySelector on:select={(e) => gameState.setDifficulty(e.detail)} />
{:else}
  <GameBoard />
{/if}

{#if showVictoryModal}
  <Modal on:close={() => showVictoryModal = false}>
    <h2>Victory!</h2>
    <p>Score: {$gameState.score}</p>
  </Modal>
{/if}
```

### 3.3 WordSelector → Svelte Action
**Current:** `WordSelector` class handling drag selection
**New:** Svelte action for reusable cell selection

```typescript
// src/lib/actions/wordSelection.ts
export function selectWord(node: HTMLElement, { onWordSelected }) {
  let isSelecting = false;
  let selectedCells: HTMLElement[] = [];

  function handleMouseDown(e: MouseEvent) {
    if (e.target instanceof HTMLElement && e.target.classList.contains('cell')) {
      isSelecting = true;
      selectedCells = [e.target];
      e.target.classList.add('selecting');
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isSelecting) return;
    // ... selection logic
  }

  function handleMouseUp() {
    if (!isSelecting) return;
    isSelecting = false;

    const word = selectedCells.map(c => c.textContent).join('');
    onWordSelected(word, selectedCells);

    selectedCells.forEach(c => c.classList.remove('selecting'));
    selectedCells = [];
  }

  node.addEventListener('mousedown', handleMouseDown);
  node.addEventListener('mousemove', handleMouseMove);
  node.addEventListener('mouseup', handleMouseUp);

  return {
    destroy() {
      node.removeEventListener('mousedown', handleMouseDown);
      node.removeEventListener('mousemove', handleMouseMove);
      node.removeEventListener('mouseup', handleMouseUp);
    }
  };
}
```

**Usage:**
```svelte
<div class="grid" use:selectWord={{ onWordSelected: handleWord }}>
  {#each cells as cell}
    <div class="cell">{cell.letter}</div>
  {/each}
</div>
```

### 3.4 WordleUI + WordleGame → Combined Svelte Component
**Current:** `WordleUI` (wordle.js) + `WordleGame` (wordle-game.js)
**New:** Single component with store

```typescript
// src/lib/stores/wordle.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { WORDS } from '$lib/data/wordle-data';

interface WordleState {
  targetWord: string;
  targetWordData: WordData;
  guesses: Guess[];
  currentGuess: string;
  gameState: 'playing' | 'won' | 'lost';
  keyboardState: Record<string, 'correct' | 'present' | 'absent' | 'empty'>;
  date: string;
}

function getTodayWord(): WordData {
  const epochDate = new Date('2024-01-01');
  const today = new Date();
  const dayNumber = Math.floor((today - epochDate) / (1000 * 60 * 60 * 24));
  return WORDS[dayNumber % WORDS.length];
}

function createWordleStore() {
  const today = new Date().toISOString().split('T')[0];

  const savedState = browser
    ? JSON.parse(localStorage.getItem('wordleGameState') || '{}')
    : {};

  // Reset if new day
  if (savedState.date !== today) {
    savedState.date = today;
    savedState.targetWordData = getTodayWord();
    savedState.guesses = [];
    savedState.currentGuess = '';
    savedState.gameState = 'playing';
    savedState.keyboardState = {};
  }

  const store = writable<WordleState>(savedState);

  if (browser) {
    store.subscribe(state => {
      localStorage.setItem('wordleGameState', JSON.stringify(state));
    });
  }

  return {
    subscribe: store.subscribe,
    addLetter: (letter: string) => store.update(s => ({
      ...s,
      currentGuess: s.currentGuess.length < 5 ? s.currentGuess + letter : s.currentGuess
    })),
    deleteLetter: () => store.update(s => ({
      ...s,
      currentGuess: s.currentGuess.slice(0, -1)
    })),
    submitGuess: () => {
      // ... Wordle evaluation logic
    }
  };
}

export const wordleState = createWordleStore();
```

---

## Phase 4: Styling Migration

### 4.1 CDS System Preservation
Keep existing CDS structure:
```
src/lib/styles/
├── tokens/
│   ├── colors.css
│   ├── typography.css
│   ├── spacing.css
│   └── elevation.css
├── components/
│   ├── buttons.css
│   ├── cards.css
│   ├── modals.css
│   └── ...
└── utilities/
    ├── layout.css
    └── helpers.css
```

**Import in +layout.svelte:**
```svelte
<script>
  import '$lib/styles/tokens/colors.css';
  import '$lib/styles/tokens/typography.css';
  // ... all CDS files
</script>
```

### 4.2 Component-Scoped Styles
Migrate component-specific CSS to `<style>` blocks:

```svelte
<script>
  // component logic
</script>

<div class="game-board">
  <!-- markup -->
</div>

<style>
  .game-board {
    display: grid;
    gap: var(--spacing-2);
  }

  /* Component-specific styles only */
</style>
```

---

## Phase 5: Data Migration

### 5.1 Word Data Modules
Convert to TypeScript modules:

```typescript
// src/lib/data/word-data.ts
export interface Word {
  word: string;
  translation: string;
  definition: string;
}

export interface Category {
  name: string;
  words: Word[];
}

export const CATEGORIES: Record<string, Category> = {
  animals: {
    name: "Animals",
    words: [
      { word: "GATTO", translation: "cat", definition: "..." },
      // ...
    ]
  },
  // ... 23 more categories
};
```

**File structure:**
- `word-data.ts` → Main categories (copy from word-data.js)
- `wordle-data.ts` → Daily puzzle words (copy from wordle-data.js)
- `wordle-valid-words.ts` → Validation set (copy from wordle-valid-words.js)

### 5.2 Grid Generation Logic
```typescript
// src/lib/utils/gridGenerator.ts
export function generateGrid(words: Word[], size: number): Cell[][] {
  // Port GridGenerator logic from grid-generator.js
  const grid = Array(size).fill(null).map(() =>
    Array(size).fill(null).map(() => ({ letter: '', placed: false }))
  );

  // Place words using existing algorithm
  // ...

  return grid;
}
```

---

## Phase 6: Cloudflare Integration

### 6.1 Cloudflare Pages Configuration
```toml
# wrangler.toml
name = "caccia-parole"
compatibility_date = "2025-01-17"
pages_build_output_dir = ".svelte-kit/cloudflare"

[build]
command = "npm run build"
```

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "npm run build && wrangler pages deploy .svelte-kit/cloudflare"
  }
}
```

### 6.2 SvelteKit Adapter Config
```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter({
      // Generate all routes as static pages
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    }),
    prerender: {
      entries: ['/', '/caccia', '/parola']
    }
  }
};
```

### 6.3 Static Asset Handling
**Fonts:** Add to `static/` folder
```
static/
├── fonts/
│   └── Poppins/ (if self-hosting)
└── favicon.ico
```

**Or keep Google Fonts:**
```html
<!-- src/app.html -->
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  %sveltekit.head%
</head>
```

---

## Phase 7: Feature Parity Checklist

### 7.1 Word Search Game
- [ ] 24 categories preserved
- [ ] 3 difficulty levels (8×8, 12×12, 16×16)
- [ ] 8-directional word placement
- [ ] Click/drag selection
- [ ] Touch support
- [ ] Word definitions modal
- [ ] Scoring system (10pts/letter)
- [ ] Victory modal
- [ ] localStorage persistence
- [ ] Back button returns to category selection

### 7.2 Paròla (Wordle)
- [ ] Daily puzzle with UTC reset
- [ ] 6 attempt limit
- [ ] 5-letter Italian words
- [ ] Color-coded feedback (green/yellow/gray)
- [ ] Physical keyboard support
- [ ] Virtual keyboard
- [ ] Keyboard state persistence
- [ ] Share functionality with emoji grid
- [ ] Puzzle numbering
- [ ] localStorage persistence
- [ ] Win/loss modals with definitions

### 7.3 General Features
- [ ] Mode selector home page
- [ ] Navigation between games
- [ ] Browser back/forward support
- [ ] Mobile responsive design
- [ ] CDS design system intact
- [ ] Google Fonts (Poppins)
- [ ] Deep linking (`/caccia`, `/parola`)

---

## Phase 8: Testing & Validation

### 8.1 Functionality Tests
```typescript
// tests/wordSearch.test.ts
import { render } from '@testing-library/svelte';
import WordSearchGame from '$lib/components/WordSearchGame.svelte';

test('renders category selector initially', () => {
  const { getByText } = render(WordSearchGame);
  expect(getByText('Select a Category')).toBeInTheDocument();
});

test('finds words correctly', () => {
  // Test word detection logic
});
```

### 8.2 Manual Testing Checklist
- [ ] Word search: Find all words in easy/medium/hard
- [ ] Word search: Definitions display correctly
- [ ] Wordle: Complete a puzzle successfully
- [ ] Wordle: Handle invalid words
- [ ] Wordle: Share button copies correct format
- [ ] Navigation: All routes accessible
- [ ] Persistence: Refresh maintains state
- [ ] Mobile: Touch events work
- [ ] Mobile: Responsive layout correct
- [ ] Keyboard: Physical keyboard works in Wordle
- [ ] Keyboard: Virtual keyboard works

### 8.3 Build Validation
```bash
npm run build
npm run preview

# Check output
# ✓ All routes prerendered
# ✓ Assets optimized
# ✓ No console errors
# ✓ localStorage works
```

---

## Phase 9: Deployment

### 9.1 Initial Deployment
```bash
# Build production bundle
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy .svelte-kit/cloudflare

# Or connect GitHub repo for auto-deployment
wrangler pages project create caccia-parole --production-branch=main
```

### 9.2 CI/CD Setup (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy .svelte-kit/cloudflare --project-name=caccia-parole
```

### 9.3 Domain Configuration
```toml
# wrangler.toml
[[env.production.routes]]
pattern = "caccia-parole.your-domain.com"
custom_domain = true
```

---

## Phase 10: Cleanup & Optimization

### 10.1 Remove Legacy Files
```bash
rm game.js wordle.js wordle-game.js word-selector.js grid-generator.js
rm word-data.js wordle-data.js wordle-valid-words.js
rm index.html styles.css
```

### 10.2 Performance Optimizations
```javascript
// svelte.config.js
export default {
  kit: {
    adapter: adapter(),
    prerender: {
      crawl: true,
      entries: ['*']
    },
    // Enable compression
    compression: {
      gzip: true,
      brotli: true
    }
  }
};
```

### 10.3 SEO & Meta Tags
```svelte
<!-- src/routes/+page.svelte -->
<svelte:head>
  <title>Caccia alle Parole - Italian Word Games</title>
  <meta name="description" content="Learn Italian through word search and daily Wordle-style puzzles">
</svelte:head>
```

---

## Migration Risks & Mitigations

### Risk 1: LocalStorage Compatibility
**Issue:** Existing users have state saved under old keys
**Mitigation:** Migration script in `onMount`
```typescript
import { onMount } from 'svelte';

onMount(() => {
  const oldState = localStorage.getItem('wordleGameState');
  if (oldState) {
    // Validate and migrate format if needed
    wordleState.set(JSON.parse(oldState));
  }
});
```

### Risk 2: URL Structure Change
**Issue:** Users with bookmarked `#parola` links
**Mitigation:** Add redirect logic
```typescript
// src/routes/+page.svelte
onMount(() => {
  const hash = window.location.hash;
  if (hash === '#parola') goto('/parola');
  if (hash === '#caccia') goto('/caccia');
});
```

### Risk 3: Event Handling Differences
**Issue:** Svelte event system differs from vanilla JS
**Mitigation:** Thorough testing of drag/touch events

### Risk 4: Build Size Increase
**Issue:** SvelteKit adds framework overhead
**Mitigation:**
- Tree-shaking enabled by default
- Code splitting per route
- Monitor bundle size

---

## Success Metrics

### Performance
- [ ] First Contentful Paint < 1s
- [ ] Time to Interactive < 2s
- [ ] Lighthouse score > 90

### Functionality
- [ ] 100% feature parity
- [ ] Zero localStorage migration issues
- [ ] All 24 categories working
- [ ] Daily Wordle resets correctly

### Deployment
- [ ] Auto-deploy from main branch
- [ ] Zero downtime deployment
- [ ] Rollback capability
- [ ] Edge caching configured

---

## Timeline Estimate

1. **Setup** (Day 1): SvelteKit init, adapter config
2. **Routing** (Day 1): File structure, layouts
3. **Components** (Days 2-3): Migrate 5 main components
4. **Stores** (Day 2): Game state management
5. **Styling** (Day 3): CDS integration
6. **Data** (Day 1): Convert JS to TS modules
7. **Testing** (Day 4): Manual + automated tests
8. **Deployment** (Day 4): Cloudflare Pages setup
9. **Validation** (Day 5): Full functionality check
10. **Polish** (Day 5): Performance optimization

**Total:** ~5 days for complete migration

---

## Rollback Plan

If critical issues arise:

1. **Emergency:** Revert to vanilla JS version
   ```bash
   git revert <migration-commit>
   wrangler publish # Re-deploy old version
   ```

2. **Partial rollback:** Keep SvelteKit but revert specific features
3. **Feature flags:** Toggle new/old implementations
   ```typescript
   const USE_SVELTE = import.meta.env.VITE_USE_SVELTE === 'true';
   ```

---

## Post-Migration Enhancements

Once stable, consider:

1. **Cloudflare KV** for global leaderboards
2. **Cloudflare Analytics** for usage tracking
3. **i18n** for additional languages
4. **PWA** with service worker for offline play
5. **Server-side word generation** (if randomization needed)
6. **User accounts** (optional, via Cloudflare Access)

---

## Unresolved Questions

1. **Domain:** Keep current domain or new one for SvelteKit version?
2. **Analytics:** Add Cloudflare Web Analytics or keep client-side only?
3. **TypeScript:** Full TS conversion or JS with JSDoc?
4. **Testing:** Unit tests required or manual QA sufficient?
5. **Versioning:** Semver for releases or date-based?
6. **i18n:** Immediate need or defer to post-migration?
7. **Backwards compat:** Support hash-based URLs permanently or temporary redirect only?
8. **Font strategy:** Self-host Poppins or keep Google Fonts CDN?
9. **State migration:** Auto-migrate old localStorage or reset on first visit?
10. **Deployment strategy:** Blue-green deployment or direct cutover?
