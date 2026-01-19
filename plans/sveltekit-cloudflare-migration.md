# SvelteKit + Cloudflare Migration Plan

## Executive Summary

**Goal:** Migrate Italian word game app from vanilla JS to SvelteKit with full TypeScript, comprehensive testing, and Cloudflare Pages deployment.

**Key Decisions:**
- ✓ Full TypeScript with strict mode
- ✓ Self-hosted Poppins fonts for performance
- ✓ Vitest (unit) + Playwright (E2E) testing
- ✓ Cloudflare Web Analytics (free tier)
- ✓ i18n architecture (English UI initially, expandable)
- ✓ Reset localStorage (no real users)
- ✓ Semantic versioning (start at v2.0.0)
- ✓ No hash URL backwards compat needed

**Timeline:** ~5 days for complete migration with testing

**Migration Approach:**
1. SvelteKit SSG → Static site generation
2. File-based routing → `/` `/caccia` `/parola`
3. Svelte stores → Game state management with localStorage
4. TypeScript modules → Strict type safety
5. Svelte actions → Reusable behaviors (drag selection)
6. Component-scoped CSS → CDS design system preserved
7. Cloudflare Pages → Optimized edge deployment

---

## Quick Reference

### Tech Stack
**Before:** Vanilla JS, hash routing, Cloudflare Workers
**After:** SvelteKit, TypeScript, file routing, Cloudflare Pages

### File Structure
```
src/
├── routes/              # Pages (/, /caccia, /parola)
├── lib/
│   ├── components/      # Svelte components
│   ├── stores/          # State management
│   ├── data/            # Word data (TS modules)
│   ├── utils/           # Game logic
│   ├── actions/         # Reusable behaviors
│   ├── i18n/            # Translations
│   └── styles/          # CDS tokens + components
└── app.html             # HTML template
```

### Dependencies
```bash
npm i @sveltejs/adapter-cloudflare
npm i -D vitest @testing-library/svelte playwright
```

### Commands
```bash
npm run dev          # Development server
npm run build        # Production build
npm run test         # All tests
npm run test:unit    # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
npm run deploy       # Deploy to Cloudflare Pages
```

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
# Choose:
# - Skeleton project
# - TypeScript with strict mode
# - ESLint
# - Prettier
# - Vitest for unit tests
# - Playwright for browser tests
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
    "@playwright/test": "^1.40.0",
    "@testing-library/svelte": "^4.0.0",
    "svelte": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

**TypeScript Config:**
```json
// tsconfig.json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true
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

**Self-Hosted Fonts (Performance Optimized):**
```bash
# Download Poppins from Google Fonts
# https://google-webfonts-helper.herokuapp.com/fonts/poppins
```

```
static/
├── fonts/
│   └── poppins/
│       ├── poppins-v20-latin-regular.woff2
│       ├── poppins-v20-latin-500.woff2
│       ├── poppins-v20-latin-600.woff2
│       └── poppins-v20-latin-700.woff2
└── favicon.ico
```

**Font CSS:**
```css
/* src/lib/styles/fonts.css */
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/poppins/poppins-v20-latin-regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/poppins/poppins-v20-latin-500.woff2') format('woff2');
}

@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/poppins/poppins-v20-latin-600.woff2') format('woff2');
}

@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/poppins/poppins-v20-latin-700.woff2') format('woff2');
}
```

**Import in layout:**
```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import '$lib/styles/fonts.css';
</script>
```

**Benefits:**
- No external DNS lookup
- No CORS issues
- Consistent loading
- Better caching control
- GDPR compliant (no Google tracking)

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

### 8.1 Unit Tests (Vitest)
```typescript
// tests/unit/gridGenerator.test.ts
import { describe, it, expect } from 'vitest';
import { generateGrid, placeWord } from '$lib/utils/gridGenerator';

describe('Grid Generator', () => {
  it('creates grid of correct size', () => {
    const grid = generateGrid([], 8);
    expect(grid.length).toBe(8);
    expect(grid[0]?.length).toBe(8);
  });

  it('places horizontal words correctly', () => {
    const grid = generateGrid([], 10);
    const placed = placeWord(grid, 'GATTO', 0, 0, 'horizontal');
    expect(placed).toBe(true);
    expect(grid[0]?.[0]?.letter).toBe('G');
    expect(grid[0]?.[4]?.letter).toBe('O');
  });

  it('detects collisions', () => {
    const grid = generateGrid([], 10);
    placeWord(grid, 'GATTO', 0, 0, 'horizontal');
    const placed = placeWord(grid, 'CANE', 0, 0, 'vertical');
    expect(placed).toBe(false);
  });
});

// tests/unit/wordleLogic.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateGuess } from '$lib/utils/wordleLogic';

describe('Wordle Logic', () => {
  it('marks correct letters green', () => {
    const result = evaluateGuess('PARLA', 'PARLA');
    expect(result).toEqual([
      { letter: 'P', status: 'correct' },
      { letter: 'A', status: 'correct' },
      { letter: 'R', status: 'correct' },
      { letter: 'L', status: 'correct' },
      { letter: 'A', status: 'correct' }
    ]);
  });

  it('marks present letters yellow', () => {
    const result = evaluateGuess('PROVA', 'PARLA');
    expect(result[0]?.status).toBe('correct'); // P
    expect(result[1]?.status).toBe('absent');  // R
    expect(result[2]?.status).toBe('absent');  // O
    expect(result[3]?.status).toBe('absent');  // V
    expect(result[4]?.status).toBe('present'); // A (in word, wrong position)
  });

  it('handles duplicate letters correctly', () => {
    const result = evaluateGuess('MASSA', 'CASSA');
    expect(result[0]?.status).toBe('absent');  // M
    expect(result[1]?.status).toBe('correct'); // A
    expect(result[2]?.status).toBe('correct'); // S
    expect(result[3]?.status).toBe('correct'); // S
    expect(result[4]?.status).toBe('correct'); // A
  });
});

// tests/unit/stores/wordle.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { wordleState } from '$lib/stores/wordle';

describe('Wordle Store', () => {
  beforeEach(() => {
    wordleState.reset();
  });

  it('initializes with empty guess', () => {
    const state = get(wordleState);
    expect(state.currentGuess).toBe('');
    expect(state.guesses).toEqual([]);
  });

  it('adds letters correctly', () => {
    wordleState.addLetter('P');
    wordleState.addLetter('A');
    const state = get(wordleState);
    expect(state.currentGuess).toBe('PA');
  });

  it('limits guess to 5 letters', () => {
    wordleState.addLetter('P');
    wordleState.addLetter('A');
    wordleState.addLetter('R');
    wordleState.addLetter('L');
    wordleState.addLetter('A');
    wordleState.addLetter('X'); // Should be ignored
    const state = get(wordleState);
    expect(state.currentGuess).toBe('PARLA');
  });

  it('deletes letters correctly', () => {
    wordleState.addLetter('P');
    wordleState.addLetter('A');
    wordleState.deleteLetter();
    const state = get(wordleState);
    expect(state.currentGuess).toBe('P');
  });
});
```

**Run unit tests:**
```bash
npm run test:unit
```

### 8.2 E2E Tests (Playwright)
```typescript
// tests/e2e/wordSearch.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Word Search Game', () => {
  test('complete game flow', async ({ page }) => {
    await page.goto('/caccia');

    // Select category
    await page.click('text=Animals');

    // Select difficulty
    await page.click('text=Easy');

    // Verify grid rendered
    const grid = page.locator('.word-grid');
    await expect(grid).toBeVisible();

    // Check word list displayed
    const wordList = page.locator('.word-list');
    await expect(wordList).toBeVisible();

    // Simulate word selection (if testable via UI)
    // Note: Drag interactions may be complex in Playwright
  });

  test('shows victory modal when all words found', async ({ page }) => {
    // This would require mocking or a test mode
  });
});

// tests/e2e/wordle.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Wordle Game', () => {
  test('complete game flow', async ({ page }) => {
    await page.goto('/parola');

    // Verify keyboard visible
    const keyboard = page.locator('.keyboard');
    await expect(keyboard).toBeVisible();

    // Type a word using virtual keyboard
    await page.click('text=P');
    await page.click('text=A');
    await page.click('text=R');
    await page.click('text=L');
    await page.click('text=A');

    // Submit guess
    await page.keyboard.press('Enter');

    // Verify guess appears in grid
    const firstRow = page.locator('.guess-row').first();
    await expect(firstRow).toContainText('P');
  });

  test('physical keyboard works', async ({ page }) => {
    await page.goto('/parola');

    // Type with physical keyboard
    await page.keyboard.type('PROVA');
    await page.keyboard.press('Enter');

    // Verify guess submitted
    const guesses = page.locator('.guess-row');
    await expect(guesses.first()).toBeVisible();
  });

  test('rejects invalid words', async ({ page }) => {
    await page.goto('/parola');

    // Type invalid word
    await page.keyboard.type('XXXXX');
    await page.keyboard.press('Enter');

    // Verify error message
    const toast = page.locator('.toast');
    await expect(toast).toContainText('not in word list');
  });

  test('share button copies to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/parola');

    // Complete game (would need test mode)
    // ...

    // Click share button
    await page.click('text=Share');

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('Paròla');
    expect(clipboardText).toMatch(/🟩|🟨|⬜/);
  });
});

// tests/e2e/navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('home page shows mode selector', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Caccia alle Parole')).toBeVisible();
    await expect(page.locator('text=Paròla')).toBeVisible();
  });

  test('navigates between games', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Caccia alle Parole');
    await expect(page).toHaveURL('/caccia');

    await page.goBack();
    await page.click('text=Paròla');
    await expect(page).toHaveURL('/parola');
  });

  test('direct URLs work', async ({ page }) => {
    await page.goto('/caccia');
    await expect(page.locator('.category-selector')).toBeVisible();

    await page.goto('/parola');
    await expect(page.locator('.keyboard')).toBeVisible();
  });
});
```

**Run E2E tests:**
```bash
npm run test:e2e
# Or with UI
npm run test:e2e -- --ui
```

### 8.3 Test Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['tests/', 'src/lib/data/']
    }
  }
});

// tests/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173', // preview server
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run preview',
    port: 4173,
  },
});
```

**package.json scripts:**
```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:e2e",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:unit:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

### 8.4 Manual Testing Checklist
- [ ] Word search: Find all words in easy/medium/hard
- [ ] Word search: Definitions display correctly
- [ ] Word search: Touch drag selection works on mobile
- [ ] Wordle: Complete a puzzle successfully
- [ ] Wordle: Handle invalid words with toast
- [ ] Wordle: Share button copies emoji grid with puzzle number
- [ ] Wordle: Physical keyboard works
- [ ] Wordle: Virtual keyboard works
- [ ] Navigation: All routes accessible
- [ ] Navigation: Browser back/forward work
- [ ] Persistence: Wordle state persists across refresh
- [ ] Mobile: Touch events work (iPhone/Android)
- [ ] Mobile: Responsive layout correct
- [ ] Mobile: Virtual keyboard doesn't break layout

### 8.5 Build Validation
```bash
# Full test suite
npm run test

# Build for production
npm run build

# Preview production build
npm run preview

# Check output
# ✓ All routes prerendered
# ✓ Assets optimized (< 500KB total)
# ✓ No console errors
# ✓ localStorage works
# ✓ Fonts load correctly
# ✓ TypeScript compiled without errors
```

---

## Phase 9: i18n Architecture (Future-Ready)

### 9.1 Design Principles
- **Learning Language Always Visible:** Italian word + translation always shown together
- **Interface Language:** UI can be in different languages (English, Spanish, French, etc.)
- **Expandable:** Design supports adding new learning languages (Spanish, French, German, etc.)

### 9.2 Data Structure
```typescript
// src/lib/types/i18n.ts
export type LearningLanguage = 'it' | 'es' | 'fr' | 'de';
export type InterfaceLanguage = 'en' | 'es' | 'fr' | 'it';

export interface Word {
  word: string;                    // Learning language word (GATTO)
  translations: {
    [key in InterfaceLanguage]: {
      translation: string;          // cat / gato / chat
      definition: string;           // Full definition in interface language
    };
  };
}

// Example usage
const word: Word = {
  word: "GATTO",
  translations: {
    en: {
      translation: "cat",
      definition: "A small domesticated feline, often kept as a pet"
    },
    es: {
      translation: "gato",
      definition: "Un pequeño felino domesticado, a menudo mantenido como mascota"
    },
    fr: {
      translation: "chat",
      definition: "Un petit félin domestiqué, souvent gardé comme animal de compagnie"
    },
    it: {
      translation: "gatto",
      definition: "Un piccolo felino domestico, spesso tenuto come animale da compagnia"
    }
  }
};
```

### 9.3 Store Architecture
```typescript
// src/lib/stores/i18n.ts
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { InterfaceLanguage, LearningLanguage } from '$lib/types/i18n';

interface I18nState {
  interfaceLanguage: InterfaceLanguage;
  learningLanguage: LearningLanguage;
}

function createI18nStore() {
  const initialState: I18nState = {
    interfaceLanguage: 'en', // Default to English UI
    learningLanguage: 'it'    // Default to Italian learning
  };

  if (browser) {
    const saved = localStorage.getItem('i18n_settings');
    if (saved) {
      Object.assign(initialState, JSON.parse(saved));
    }
  }

  const store = writable<I18nState>(initialState);

  if (browser) {
    store.subscribe(state => {
      localStorage.setItem('i18n_settings', JSON.stringify(state));
    });
  }

  return {
    subscribe: store.subscribe,
    setInterfaceLanguage: (lang: InterfaceLanguage) =>
      store.update(s => ({ ...s, interfaceLanguage: lang })),
    setLearningLanguage: (lang: LearningLanguage) =>
      store.update(s => ({ ...s, learningLanguage: lang }))
  };
}

export const i18n = createI18nStore();
```

### 9.4 Translation Files
```typescript
// src/lib/i18n/en.ts
export const en = {
  common: {
    back: 'Back',
    next: 'Next',
    play: 'Play',
    share: 'Share'
  },
  home: {
    title: 'Italian Word Games',
    wordSearch: 'Word Search Hunt',
    wordle: 'Daily Word Puzzle'
  },
  wordSearch: {
    selectCategory: 'Select a Category',
    selectDifficulty: 'Select Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    score: 'Score',
    foundWords: 'Found Words',
    victory: 'Victory!',
    finalScore: 'Final Score'
  },
  wordle: {
    title: 'Paròla',
    puzzleNumber: 'Puzzle #{{number}}',
    attempts: '{{current}}/{{max}} attempts',
    victory: 'Amazing!',
    defeat: 'Better luck tomorrow!',
    share: 'Share Results',
    invalidWord: 'Not in word list',
    tooShort: 'Not enough letters'
  }
};

// src/lib/i18n/es.ts
export const es = {
  common: {
    back: 'Atrás',
    next: 'Siguiente',
    play: 'Jugar',
    share: 'Compartir'
  },
  home: {
    title: 'Juegos de Palabras en Italiano',
    wordSearch: 'Buscar Palabras',
    wordle: 'Rompecabezas Diario'
  },
  // ... rest of translations
};
```

### 9.5 Translation Helper
```typescript
// src/lib/utils/translate.ts
import { derived } from 'svelte/store';
import { i18n } from '$lib/stores/i18n';
import { en } from '$lib/i18n/en';
import { es } from '$lib/i18n/es';
// ... import other languages

const translations = { en, es };

export const t = derived(i18n, $i18n => {
  const lang = translations[$i18n.interfaceLanguage] || en;

  return (key: string, params?: Record<string, string | number>) => {
    const keys = key.split('.');
    let value: any = lang;

    for (const k of keys) {
      value = value?.[k];
      if (!value) return key; // Fallback to key if not found
    }

    if (typeof value !== 'string') return key;

    // Replace {{variable}} with params
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, varName) =>
        String(params[varName] ?? '')
      );
    }

    return value;
  };
});
```

### 9.6 Component Usage
```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { t } from '$lib/utils/translate';
  import { i18n } from '$lib/stores/i18n';
</script>

<h1>{$t('home.title')}</h1>

<div class="game-cards">
  <a href="/caccia" class="card">
    <h2>{$t('home.wordSearch')}</h2>
  </a>

  <a href="/parola" class="card">
    <h2>{$t('home.wordle')}</h2>
  </a>
</div>

<!-- Language selector -->
<select bind:value={$i18n.interfaceLanguage}>
  <option value="en">English</option>
  <option value="es">Español</option>
  <option value="fr">Français</option>
  <option value="it">Italiano</option>
</select>
```

### 9.7 Word Display Pattern
```svelte
<!-- Always show learning language + translation -->
<div class="word-display">
  <span class="learning-word" lang="it">GATTO</span>
  <span class="separator">•</span>
  <span class="translation">{word.translations[$i18n.interfaceLanguage].translation}</span>
</div>

<!-- Definition in interface language -->
<p class="definition">
  {word.translations[$i18n.interfaceLanguage].definition}
</p>
```

### 9.8 Migration Notes
**Phase 1 (Current):** Start with Italian learning + English interface
**Phase 2 (Future):** Add Spanish/French interface translations
**Phase 3 (Future):** Add Spanish as learning language with full word set
**Phase 4 (Future):** Add French/German as learning languages

---

## Phase 10: Cloudflare Analytics

### 10.1 Setup (Free Tier)
```bash
# Enable in Cloudflare dashboard
# Pages -> caccia-parole -> Analytics -> Web Analytics
```

### 10.2 Add Beacon Script
```html
<!-- src/app.html -->
<head>
  %sveltekit.head%

  <!-- Cloudflare Web Analytics -->
  <script defer src='https://static.cloudflareinsights.com/beacon.min.js'
          data-cf-beacon='{"token": "YOUR_TOKEN_HERE"}'></script>
</head>
```

**Token location:** Cloudflare Dashboard → Analytics → Web Analytics → JavaScript Snippet

### 10.3 Custom Events (Optional)
```typescript
// src/lib/utils/analytics.ts
export function trackEvent(eventName: string, data?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.__cfBeacon) {
    window.__cfBeacon.track(eventName, data);
  }
}

// Usage in components
import { trackEvent } from '$lib/utils/analytics';

function handleGameComplete() {
  trackEvent('game_complete', {
    game: 'wordle',
    attempts: 4,
    won: true
  });
}
```

### 10.4 Metrics to Track
**Automatic (Free):**
- Page views
- Unique visitors
- Bounce rate
- Session duration
- Device types
- Geographic location
- Referrers

**Custom Events (Optional):**
- Game completions
- Word searches by category
- Wordle attempts distribution
- Share button clicks
- Definition views

### 10.5 Privacy
Cloudflare Web Analytics:
- ✓ No cookies
- ✓ No cross-site tracking
- ✓ GDPR compliant
- ✓ No consent banner required
- ✓ Server-side aggregation

---

## Phase 11: Deployment
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
**Decision:** Reset localStorage on first visit (no real users)
**Mitigation:** Clear old keys on app init
```typescript
// src/routes/+layout.svelte
import { onMount } from 'svelte';

onMount(() => {
  // Clear legacy localStorage on first visit to SvelteKit version
  if (!localStorage.getItem('sveltekit_migrated')) {
    localStorage.clear();
    localStorage.setItem('sveltekit_migrated', 'true');
  }
});
```

### Risk 2: URL Structure Change
**Issue:** Users with bookmarked `#parola` links
**Decision:** No special handling needed (no real users)

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

1. **Setup** (Day 1): SvelteKit init, TypeScript strict mode, test frameworks
2. **Routing** (Day 1): File structure, layouts, fonts
3. **Components** (Days 2-3): Migrate 5 main components + actions
4. **Stores** (Day 2): Game state management with TypeScript
5. **Styling** (Day 3): CDS integration, self-hosted fonts
6. **Data** (Day 1): Convert JS to TS modules with strict types
7. **i18n** (Day 3): Architecture setup (English UI only initially)
8. **Testing** (Day 4): Unit tests (Vitest) + E2E tests (Playwright)
9. **Analytics** (Day 4): Cloudflare Web Analytics integration
10. **Deployment** (Day 5): Cloudflare Pages + CI/CD
11. **Validation** (Day 5): Full functionality + test suite
12. **Polish** (Day 5): Performance optimization + semver tagging

**Total:** ~5 days for complete migration with testing

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

## Versioning Strategy (Semver)

### Package.json Initial Version
```json
{
  "name": "caccia-alle-parole",
  "version": "2.0.0",
  "description": "Italian word games - SvelteKit edition"
}
```

**Why 2.0.0?**
- Major rewrite (vanilla JS → SvelteKit)
- Breaking change in architecture
- URL structure change (hash → paths)

### Version Bump Guidelines
**Patch (2.0.X):** Bug fixes, typos, performance tweaks
**Minor (2.X.0):** New categories, new word data, UI improvements, new features
**Major (X.0.0):** Breaking changes, data structure changes, i18n system changes

### Tagging Releases
```bash
# After migration complete
git tag -a v2.0.0 -m "SvelteKit migration complete"
git push origin v2.0.0

# Future releases
npm version patch  # 2.0.1
npm version minor  # 2.1.0
npm version major  # 3.0.0
```

### CHANGELOG.md
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-XX

### Added
- SvelteKit framework with SSG
- TypeScript with strict mode
- Vitest unit tests
- Playwright E2E tests
- Self-hosted Poppins fonts
- Cloudflare Web Analytics
- i18n architecture (English UI)
- Cloudflare Pages deployment

### Changed
- Routing from hash-based to path-based
- Class components to Svelte components
- Vanilla JS to TypeScript
- Google Fonts to self-hosted fonts

### Removed
- Hash-based routing (#parola, #caccia)
- Legacy localStorage format

## [1.0.0] - 2026-01-17

### Added
- Initial vanilla JS implementation
- Word search game with 24 categories
- Paròla (Wordle) game with daily puzzles
- 2000+ Italian words
```

---

## Post-Migration Enhancements

Once stable, consider:

1. **Cloudflare KV** for global leaderboards
2. **Additional interface languages** (Spanish, French UI)
3. **PWA** with service worker for offline play
4. **Server-side word generation** (if randomization needed)
5. **User accounts** (optional, via Cloudflare Access)
6. **Additional learning languages** (Spanish, French, German words)

---

## Decisions Made

1. **Domain:** Keep current domain ✓
2. **TypeScript:** Full TypeScript conversion ✓
3. **Analytics:** Cloudflare Web Analytics (free tier) ✓
4. **Backwards compat:** No special handling (no real users) ✓
5. **Font strategy:** Self-host Poppins for performance ✓
6. **State migration:** Reset localStorage on first visit ✓
7. **Testing:** Implement proper test suite (Vitest + Playwright) ✓
8. **i18n:** Design for future i18n, start with Italian as learning target ✓
9. **Versioning:** Semantic versioning ✓
10. **Deployment:** Cloudflare auto-handles deployment strategy ✓
