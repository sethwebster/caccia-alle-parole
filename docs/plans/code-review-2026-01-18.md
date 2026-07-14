# Framework Assessment: Caccia alle Parole

**Date:** 2026-01-18
**Reviewer:** Code Review
**Question:** Should this project migrate to React or another framework?

---

## Executive Summary

**Verdict: Stay with vanilla JavaScript.**

This is a well-architected vanilla JS codebase that does NOT need a framework. The complexity is bounded, the architecture is clean, and adding React would increase bundle size by 5-10x while providing zero user-facing benefits. Below is the detailed analysis.

---

## Codebase Metrics

| Metric | Value |
|--------|-------|
| Total JS Lines | 12,376 |
| Logic Lines (excluding data) | ~1,550 |
| Total Size | 872KB |
| Data Files | ~10,800 lines (87%) |
| Dependencies | 0 |
| Build Step | None |

---

## Architecture Analysis

### Current Structure (Good)

```
GameManager           - Router + mode orchestration
  |
  +-- WordSearchGame  - Word search game logic + UI
  |
  +-- WordleUI        - Wordle presentation layer
       |
       +-- WordleGame - Pure game logic (no DOM)
```

This is a clean separation. The Wordle implementation follows MVC correctly:
- `WordleGame` is pure logic with zero DOM dependencies
- `WordleUI` handles rendering and input
- State flows one direction via callback (`setStateChangeCallback`)

### What They Did Right

1. **Logic/UI Separation in Wordle**
   - `wordle-game.js` is framework-agnostic pure JS
   - Could be unit tested without DOM
   - State changes trigger re-renders via callback pattern

2. **Module System**
   - ES6 modules with clear boundaries
   - Single responsibility per file
   - Exportable functions for grid generation, word selection

3. **Event Handling**
   - Proper cleanup in `word-selector.js` (line 77-87)
   - Bound handlers stored for removal
   - No event listener leaks

4. **Singleton Pattern for Selector**
   - Prevents multiple instances
   - Clean reset mechanism

---

## Why React Would NOT Help

### 1. Complexity Ceiling

This app has a fixed complexity ceiling:
- 2 games, unlikely to become 20
- No form-heavy CRUD workflows
- No deep component trees
- No server state synchronization
- No real-time collaboration

React shines when you have:
- Deep component nesting with prop drilling nightmares
- Complex form state with many interdependent fields
- Server state caching/invalidation (React Query territory)
- Large teams needing component contracts

None of these apply here.

### 2. Bundle Size Reality

| Stack | Estimated Size |
|-------|----------------|
| Current (vanilla) | 872KB total (800KB+ is dictionary data) |
| With React | +150KB minified (~45KB gzipped) |
| With React + Router | +180KB |
| With React + Router + State Lib | +200KB |

The actual **logic** is ~70KB. Adding React would double that for zero benefit.

### 3. What React Would Give You

- JSX syntax (subjective preference, not objectively better)
- Component devtools (nice, but Chrome devtools work fine here)
- Ecosystem plugins (you don't need any)
- Virtual DOM diffing (you're already doing targeted DOM updates)

### 4. What React Would Cost You

- Build step required (Vite/Webpack/Babel)
- Development server setup
- HMR configuration
- Bundle optimization work
- Breaking current deployment simplicity
- Learning curve for team members

---

## Architectural Concerns (Regardless of Framework)

### Yellow Flags

#### 1. WordSearchGame Class Mixes Concerns

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/game.js` lines 133-409

The `WordSearchGame` class handles:
- Category loading (data access)
- Game state management
- Grid rendering
- Word list rendering
- Modal management
- Text-to-speech
- Score tracking
- Event delegation

**Impact:** Testing difficulty, harder to modify individual features.

**Recommendation:** If this grows, extract:
```javascript
// word-search-renderer.js - DOM operations only
// word-search-state.js - Pure game state (like WordleGame)
// modal-service.js - Reusable modal logic
```

#### 2. Direct DOM Queries Throughout

**Location:** Multiple files

```javascript
// game.js line 147-158 - DOM queries in constructor
this.categorySelect = document.getElementById('category');
this.difficultyButtons = document.querySelectorAll('.difficulty-btn');
// ... 10 more getElementById calls
```

**Impact:** Tight coupling to HTML structure, refactoring risk.

**Recommendation:** Consider a lightweight render pattern:
```javascript
// Instead of scattered getElementById calls
const elements = {
  grid: () => document.getElementById('word-grid'),
  score: () => document.getElementById('score'),
  // Lazy evaluation prevents null issues
};
```

#### 3. Modal Logic Duplicated

**Location:** Both games have their own modal show/hide logic

- `game.js` lines 389-408 (definition + victory modals)
- `wordle.js` lines 264-280 (victory modal)

**Recommendation:** Extract `modal.js`:
```javascript
export function showModal(id, content) { /* ... */ }
export function hideModal(id) { /* ... */ }
```

---

## Green Flags (Keep These Patterns)

### 1. WordleGame State Machine

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/wordle-game.js`

This is textbook clean architecture:
- Immutable state transitions
- No DOM dependencies
- Callback-based notification
- Easily testable

### 2. Event Cleanup Pattern

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/word-selector.js` lines 55-87

```javascript
// Bound handlers stored for proper removal
this.handlers.mousedown = this.handleMouseDown.bind(this);
// ...
cleanup() {
  this.gridElement.removeEventListener('mousedown', this.handlers.mousedown);
}
```

### 3. Grid Generator is Pure

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/grid-generator.js`

`generateGrid()` takes data in, returns data out. No side effects. Could be unit tested trivially.

---

## If You MUST Framework

If external pressure forces a framework choice (team standards, hiring, etc.):

### DO NOT Use React

Overkill. You'd spend more time fighting React patterns than building features.

### Consider Preact + HTM

```javascript
import { h, render } from 'preact';
import { html } from 'htm/preact';

function Tile({ letter, state }) {
  return html`<div class="wordle-tile tile-${state}">${letter}</div>`;
}
```

- 3KB gzipped
- No build step required (htm compiles at runtime)
- Same patterns as React if you ever need to migrate
- JSX-like syntax without Babel

### Consider Vanilla Web Components

```javascript
class WordleTile extends HTMLElement {
  static observedAttributes = ['letter', 'state'];
  attributeChangedCallback(name, old, value) {
    this.render();
  }
  render() {
    this.className = `wordle-tile tile-${this.getAttribute('state')}`;
    this.textContent = this.getAttribute('letter');
  }
}
customElements.define('wordle-tile', WordleTile);
```

Native browser feature. Zero dependencies. Future-proof.

---

## Recommended Improvements (Vanilla)

### Priority 1: Extract WordSearch State

Create `word-search-game.js` mirroring the Wordle pattern:

```javascript
// word-search-state.js
export class WordSearchState {
  constructor() {
    this.category = null;
    this.difficulty = 'medium';
    this.grid = null;
    this.words = [];
    this.foundWords = new Set();
    this.score = 0;
    this.onStateChange = null;
  }

  startGame(category, difficulty) {
    // Pure state transitions
  }

  foundWord(word) {
    // Update state, call callback
  }

  getState() {
    return { /* immutable snapshot */ };
  }
}
```

This enables:
- Unit testing without DOM
- State persistence (localStorage) without coupling
- Future multiplayer/server sync

### Priority 2: Modal Service

```javascript
// modal-service.js
const activeModals = new Set();

export function show(modalId, data = {}) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  // Populate data slots
  Object.entries(data).forEach(([key, value]) => {
    const slot = modal.querySelector(`[data-slot="${key}"]`);
    if (slot) slot.textContent = value;
  });

  modal.classList.remove('hidden');
  activeModals.add(modalId);

  // Click-outside handling
  modal.addEventListener('click', handleOutsideClick);
}

export function hide(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
  activeModals.delete(modalId);
}
```

### Priority 3: Router Cleanup

Current URL routing works but could be cleaner:

```javascript
// router.js
const routes = {
  'wordle': () => showWordle(),
  'word-search': () => showWordSearch(),
  '': () => showMenu()
};

export function init() {
  window.addEventListener('popstate', handleRoute);
  handleRoute();
}

function handleRoute() {
  const hash = location.hash.slice(1) || '';
  const handler = routes[hash] || routes[''];
  handler();
}

export function navigate(route) {
  history.pushState({}, '', `#${route}`);
  handleRoute();
}
```

---

## Final Verdict

### DO NOT migrate to React.

This codebase demonstrates that vanilla JavaScript, properly structured, handles bounded complexity elegantly. The current architecture is maintainable, testable (with minor refactoring), and performs well.

A framework migration would:
- Add 150KB+ to bundle
- Require build tooling
- Provide zero user-facing improvements
- Consume weeks of development time

The only valid reasons to migrate:
1. Team mandate requiring framework standardization
2. Plans to scale to 10+ games with shared component library
3. Need for React-specific ecosystem tools (which you don't)

### What WOULD improve this codebase:

1. Extract `WordSearchState` (like `WordleGame`)
2. Create shared `modal-service.js`
3. Add unit tests for pure logic modules
4. Consider TypeScript (JSDoc types at minimum)

These improvements work WITH the current architecture, not against it.

---

## Appendix: Complexity Comparison

| Feature | Vanilla Implementation | React Implementation |
|---------|----------------------|---------------------|
| Wordle Grid | 50 lines (`renderGuesses`) | ~80 lines (component + hooks) |
| Keyboard | 30 lines (`buildKeyboard`) | ~60 lines (component + event handling) |
| Word Search Grid | 20 lines (`renderGrid`) | ~40 lines (component) |
| State Management | 195 lines (`WordleGame`) | 195 lines (same, or useReducer) |
| Bundle Impact | 0KB | +150KB |

React adds indirection without reducing complexity for apps at this scale.
