# Code Review: Caccia alle Parole - Italian Word Search Game

**Date:** 2026-01-17
**Reviewer:** Code Review
**Files Reviewed:** index.html, styles.css, game.js, word-data.js, grid-generator.js, word-selector.js

---

## Executive Summary

This is a well-structured vanilla JavaScript word search game with clean separation of concerns. However, several issues require attention: unbounded recursion in grid generation, potential memory leaks from unremoved event listeners, race conditions in timer management, XSS vectors in DOM manipulation, and significant code duplication. The architecture is sound but the implementation has rough edges that could cause production issues.

---

## Critical Issues

### 1. Unbounded Recursion - Stack Overflow Risk

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/grid-generator.js:175-178`

```javascript
if (placedWords.length < Math.min(5, selectedWords.length)) {
    // Retry with fresh grid if too few words placed
    return generateGrid(words, difficulty);
}
```

**Problem:** If word placement consistently fails (e.g., many long overlapping words), this recursive call has no depth limit. With sufficiently problematic input, this will blow the call stack.

**Impact:** Browser crash, frozen tab, terrible user experience.

**Solution:** Add a retry counter parameter with maximum attempts:

```javascript
export function generateGrid(words, difficulty = 'medium', _retryCount = 0) {
    const MAX_RETRIES = 10;

    // ... existing code ...

    if (placedWords.length < Math.min(5, selectedWords.length)) {
        if (_retryCount >= MAX_RETRIES) {
            console.warn('Grid generation failed after max retries');
            // Return partial result or throw
        }
        return generateGrid(words, difficulty, _retryCount + 1);
    }
}
```

---

### 2. Memory Leak - Event Listeners Never Removed

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/word-selector.js:55-75`

```javascript
function attachEventListeners() {
    const grid = state.gridElement;
    grid.addEventListener("mousedown", handleMouseDown);
    grid.addEventListener("mousemove", handleMouseMove);
    // ... 8+ more listeners
}
```

**Problem:** `initSelector()` is called on every new game but `attachEventListeners()` adds handlers without ever removing previous ones. After N games, there are N copies of each handler.

**Impact:** Memory leak, degraded performance, potential duplicate event firing.

**Solution:** Track if listeners are attached, or remove before adding:

```javascript
let listenersAttached = false;

export function initSelector(gridElement, words, onWordFound, onCellClick) {
    if (state.gridElement && listenersAttached) {
        removeEventListeners(); // Need to implement this
    }
    // ... rest of init
    if (!listenersAttached) {
        attachEventListeners();
        listenersAttached = true;
    }
}
```

Or use AbortController for cleaner cleanup.

---

### 3. Race Condition - Timer Interval Leak

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/game.js:251-261`

```javascript
startTimer() {
    if (this.timerInterval) {
        clearInterval(this.timerInterval);
    }
    this.timerInterval = setInterval(() => {
        this.timerSeconds++;
        // ...
    }, 1000);
}
```

**Problem:** If `startNewGame()` is called rapidly (spam clicking), the `async` nature and the `resetGame()` -> `startTimer()` sequence could allow multiple intervals to exist. The guard `if (this.timerInterval)` only clears if the reference still exists.

Additionally, `resetGame()` at line 142-144 also clears the interval but doesn't null out the reference:

```javascript
if (this.timerInterval) {
    clearInterval(this.timerInterval);
}
// Missing: this.timerInterval = null;
```

**Impact:** Multiple timers running, incorrect time display, memory leak.

**Solution:** Always null the reference after clearing:

```javascript
resetGame() {
    // ...
    if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
    }
}
```

---

### 4. XSS Vector - innerHTML Assignment

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/game.js:155`

```javascript
this.gridContainer.innerHTML = '';
```

This is safe, but the real issue is at line 161:

```javascript
cellElement.textContent = letter;
```

This is safe because `textContent` is used. However, at lines 179-181:

```javascript
const wordSpan = document.createElement('span');
wordSpan.className = 'word-text';
wordSpan.textContent = wordData.word;
```

The word comes from `word-data.js` which is static, but the pattern matters for future changes.

**Actually safe:** Upon review, all DOM insertions use `textContent` or `createElement` with property assignment, not `innerHTML` with interpolation. No XSS vulnerability exists in current code.

---

### 5. Potential DOS via Category Validation Missing

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/game.js:108`

```javascript
const categoryWords = wordDatabase[this.currentCategory];
```

**Problem:** `this.currentCategory` comes from user-controlled select element. While the options are populated programmatically, a malicious user could modify the DOM to add invalid category values.

**Impact:** Accessing `wordDatabase[maliciousKey]` returns `undefined`, which is handled at line 109-112. However, if someone added a `__proto__` option, this could be prototype pollution.

**Mitigation:** Already partially handled, but explicit validation is better:

```javascript
if (!categories.includes(this.currentCategory)) {
    alert('Categoria non valida!');
    return;
}
```

---

## Architecture Concerns

### 1. Global Mutable State in word-selector.js

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/word-selector.js:7-20`

```javascript
let state = {
    isSelecting: false,
    startCell: null,
    // ... module-level mutable state
};
```

**Problem:** Module-level mutable state makes testing difficult, prevents multiple game instances, and creates implicit coupling. Any code importing this module shares the same state.

**Impact:** Cannot have two word search games on the same page. Testing requires manual state cleanup.

**Recommendation:** Convert to a class or use a factory function that returns state and methods:

```javascript
export function createSelector() {
    const state = { /* ... */ };
    return {
        init: (gridElement, words, onWordFound, onCellClick) => { /* ... */ },
        reset: () => { /* ... */ },
        getFoundWords: () => { /* ... */ },
    };
}
```

---

### 2. Tight Coupling Between Game and DOM

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/game.js:21-34`

```javascript
initializeElements() {
    this.categorySelect = document.getElementById('category');
    this.difficultyButtons = document.querySelectorAll('.difficulty-btn');
    // ... 10+ DOM queries
}
```

**Problem:** The game class directly queries the DOM by ID, creating tight coupling to HTML structure. Makes testing impossible without a full DOM.

**Impact:** Cannot unit test game logic. HTML changes break JavaScript.

**Recommendation:** Pass elements as constructor parameters or use a dependency injection pattern.

---

### 3. Mixed Concerns in Game Class

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/game.js`

The `WordSearchGame` class handles:
- DOM manipulation (rendering)
- State management (score, timer)
- Event handling (listeners)
- Business logic (word matching)
- UI feedback (modals)

**Impact:** Class is doing too much. Difficult to modify one concern without risking others.

**Recommendation:** Extract concerns:
- `GameState` - pure state management
- `GameRenderer` - DOM updates
- `GameController` - event handling and coordination

---

### 4. No Error Boundaries

**Problem:** If any part of the code throws, the entire game becomes unresponsive with no user feedback.

**Location:** Throughout, but especially `/Users/sethwebster/Development/caccia-alle-parole/game.js:99-133`

**Recommendation:** Wrap critical paths in try-catch with user-friendly error display:

```javascript
async startNewGame() {
    try {
        // ... existing code
    } catch (error) {
        console.error('Failed to start game:', error);
        alert('Si e verificato un errore. Riprova.');
    }
}
```

---

## DRY Opportunities

### 1. Duplicate Direction Definitions

**Location:**
- `/Users/sethwebster/Development/caccia-alle-parole/grid-generator.js:15-24`
- `/Users/sethwebster/Development/caccia-alle-parole/word-selector.js:23-32`

```javascript
// grid-generator.js
const DIRECTIONS = [
  { dx: 1, dy: 0, name: 'horizontal' },
  { dx: -1, dy: 0, name: 'horizontal-rev' },
  // ...
];

// word-selector.js
const DIRECTIONS = [
  { dr: -1, dc: 0, name: "N" },
  { dr: -1, dc: 1, name: "NE" },
  // ...
];
```

**Problem:** Same concept, different naming (dx/dy vs dr/dc), different names (horizontal vs E). Maintenance burden doubles.

**Solution:** Create shared `constants.js`:

```javascript
export const DIRECTIONS = [
    { row: 0, col: 1, name: 'E' },
    { row: 0, col: -1, name: 'W' },
    // ...
];
```

---

### 2. Duplicate Word Normalization

**Location:**
- `/Users/sethwebster/Development/caccia-alle-parole/word-selector.js:43-45`
- `/Users/sethwebster/Development/caccia-alle-parole/word-selector.js:510-512`
- `/Users/sethwebster/Development/caccia-alle-parole/grid-generator.js:124-126`

```javascript
// Appears 3 times in different forms
words.map(w => typeof w === "string" ? { word: w.toUpperCase() } : { ...w, word: w.word.toUpperCase() })
```

**Solution:** Single utility function:

```javascript
export function normalizeWords(words) {
    return words.map(w =>
        typeof w === 'string'
            ? { word: w.toUpperCase().trim(), definition: '' }
            : { ...w, word: w.word.toUpperCase().trim() }
    );
}
```

---

### 3. Duplicate Cell Coordinate Handling

**Location:**
- `/Users/sethwebster/Development/caccia-alle-parole/word-selector.js:80-88`
- `/Users/sethwebster/Development/caccia-alle-parole/word-selector.js:268-279`

```javascript
// getCellFromEvent
const row = parseInt(target.dataset.row);
const col = parseInt(target.dataset.col);
const letter = target.dataset.letter;
return { row, col, letter, element: target };

// getCellFromPoint - nearly identical
```

**Solution:** Extract to single function that handles both cases:

```javascript
function extractCellData(element) {
    if (!element) return null;
    const target = element.closest('[data-row]');
    if (!target) return null;
    return {
        row: parseInt(target.dataset.row, 10),
        col: parseInt(target.dataset.col, 10),
        letter: target.dataset.letter,
        element: target
    };
}
```

---

### 4. Duplicate Category Name Mapping

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/game.js:64-89`

```javascript
const categoryNames = {
    animali: 'Animali',
    cibo: 'Cibo',
    // ... 24 entries
};
```

**Problem:** Category names are defined separately from word-data.js. If a category is added to word-data.js, this map must be manually updated.

**Solution:** Move display names into word-data.js:

```javascript
export const categoryMeta = {
    animali: { displayName: 'Animali', icon: '...' },
    cibo: { displayName: 'Cibo', icon: '...' },
};
```

---

## Maintenance Improvements

### 1. Missing parseInt Radix

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/word-selector.js:84-85`

```javascript
const row = parseInt(target.dataset.row);
const col = parseInt(target.dataset.col);
```

**Problem:** `parseInt` without radix can have unexpected behavior with leading zeros.

**Solution:** Always specify radix:

```javascript
const row = parseInt(target.dataset.row, 10);
const col = parseInt(target.dataset.col, 10);
```

---

### 2. Magic Numbers

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/grid-generator.js:76`

```javascript
function attemptPlaceWord(grid, word, maxAttempts = 100) {
```

And `/Users/sethwebster/Development/caccia-alle-parole/game.js:229`

```javascript
setTimeout(() => this.showVictoryModal(), 500);
```

**Problem:** Magic numbers without explanation.

**Solution:** Define as named constants:

```javascript
const WORD_PLACEMENT_MAX_ATTEMPTS = 100;
const VICTORY_MODAL_DELAY_MS = 500;
```

---

### 3. Inconsistent Async/Await Usage

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/game.js:99`

```javascript
async startNewGame() {
```

**Problem:** Method is marked `async` but contains no `await` calls. Misleading and unnecessary.

**Solution:** Remove `async` keyword since it's not used:

```javascript
startNewGame() {
```

---

### 4. No JSDoc for Public API

**Problem:** Exported functions lack proper documentation for parameters and return values.

**Location:** All exported functions in all modules.

**Recommendation:** Add JSDoc:

```javascript
/**
 * Generate a word search grid with placed words
 * @param {string[]} words - Array of words to place in the grid
 * @param {'easy'|'medium'|'hard'} difficulty - Difficulty level
 * @returns {{ grid: string[][], placedWords: PlacedWord[], size: number, difficulty: string }}
 */
export function generateGrid(words, difficulty = 'medium') {
```

---

### 5. Inconsistent Error Handling with Alerts

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/game.js:101-102, 110-112`

```javascript
alert('Seleziona una categoria e una difficolta!');
// ...
alert('Nessuna parola disponibile per questa categoria!');
```

**Problem:** Native `alert()` blocks the thread, cannot be styled, poor UX.

**Solution:** Use the existing modal system for errors, or at minimum create a toast notification system.

---

### 6. Timer Not Cleared on Page Unload

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/game.js`

**Problem:** If user navigates away, timer interval continues until garbage collected.

**Solution:** Add cleanup:

```javascript
constructor() {
    // ... existing code
    window.addEventListener('beforeunload', () => this.cleanup());
}

cleanup() {
    if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
    }
}
```

---

## Performance Concerns

### 1. Repeated DOM Queries in Selection

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/word-selector.js:344-346`

```javascript
function getCellElement(row, col) {
    return state.gridElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}
```

**Problem:** Called multiple times during drag selection. DOM queries are expensive.

**Solution:** Cache cell elements on grid render:

```javascript
const cellCache = new Map();

function initCellCache() {
    cellCache.clear();
    state.gridElement.querySelectorAll('[data-row]').forEach(el => {
        cellCache.set(`${el.dataset.row}-${el.dataset.col}`, el);
    });
}

function getCellElement(row, col) {
    return cellCache.get(`${row}-${col}`);
}
```

---

### 2. Inefficient Word Search in findWord

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/word-selector.js:388-399`

```javascript
function findWord(word) {
    const wordUpper = word.toUpperCase();
    const wordReverse = wordUpper.split("").reverse().join("");

    for (const w of state.words) {
        if (w.word === wordUpper || w.word === wordReverse) {
            return w;
        }
    }
    return null;
}
```

**Problem:** O(n) search for every selection. Creates reverse string every time.

**Solution:** Pre-compute a Set of valid words (forward and reverse):

```javascript
let validWordsSet = new Set();

function initValidWords(words) {
    validWordsSet.clear();
    words.forEach(w => {
        validWordsSet.add(w.word);
        validWordsSet.add(w.word.split('').reverse().join(''));
    });
}
```

---

### 3. Sorting Words by Random on Every Call

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/word-data.js:513`

```javascript
const shuffled = [...words].sort(() => Math.random() - 0.5);
```

**Problem:** `Math.random() - 0.5` produces biased shuffles. Fisher-Yates is correct.

**Solution:**

```javascript
function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
```

---

## Nitpicks

### 1. Inconsistent Semicolons

**Location:** `word-selector.js` uses semicolons everywhere; other files are mixed.

**Recommendation:** Use a linter (ESLint) with consistent config.

---

### 2. Inconsistent Quotes

**Location:** `word-selector.js` uses double quotes; `game.js` uses single quotes.

**Recommendation:** Pick one and stick to it.

---

### 3. Dead/Unused Code

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/game.js:14`

```javascript
this.placedWords = [];
```

This property is reset but never actually used for anything.

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/word-data.js:517`

```javascript
export default wordDatabase;
```

Default export duplicates named export. Pick one.

---

### 4. CSS Variable Naming

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/styles.css:10`

```css
--cell-size: 45px;
```

**Issue:** Cell size is presentation, but also used in JS calculations implicitly. Consider documenting this coupling.

---

### 5. Accessibility Missing

**Problem:** No ARIA labels, no keyboard navigation support, no screen reader announcements.

**Locations:** Throughout `index.html` and all JS files.

**Recommendation:**
- Add `role="grid"` and `role="gridcell"`
- Add keyboard navigation (arrow keys)
- Announce found words to screen readers
- Add focus indicators

---

## Strengths

1. **Clean Module Separation**: Each file has a clear responsibility. `grid-generator.js` only generates grids, `word-selector.js` only handles selection.

2. **Italian Letter Frequency**: Using realistic Italian letter distribution for filler letters is a thoughtful touch that improves immersion.

3. **Bidirectional Word Matching**: Checking both forward and reverse of selected letters handles all 8 directions elegantly.

4. **Touch Support**: Mobile-friendly implementation with proper touch event handling and `preventDefault()` to avoid scroll interference.

5. **Progressive Enhancement**: The game works with just JavaScript enabled. No complex build system required.

6. **Comprehensive Word Database**: 400+ words across 24 categories with educational definitions is substantial content.

7. **Collision-Tolerant Word Placement**: The algorithm correctly allows letters to overlap when they match, increasing word density.

8. **Visual Feedback**: Selection highlighting and found word styling provide clear user feedback.

---

## Summary of Required Fixes (Priority Order)

| Priority | Issue | File | Line |
|----------|-------|------|------|
| P0 | Unbounded recursion in grid generation | grid-generator.js | 175-178 |
| P0 | Event listener memory leak | word-selector.js | 55-75 |
| P1 | Timer interval race condition | game.js | 142-144 |
| P1 | Missing timer cleanup on unload | game.js | N/A |
| P2 | Biased shuffle algorithm | word-data.js | 513 |
| P2 | Repeated DOM queries in selection | word-selector.js | 344-346 |
| P3 | Duplicate direction definitions | multiple files | - |
| P3 | Global mutable state | word-selector.js | 7-20 |

---

## Unresolved Questions

1. Multi-instance support needed? (affects state architecture)
2. Accessibility requirements defined?
3. Offline/PWA support planned? (affects caching strategy)
4. Analytics/telemetry desired? (affects error handling)
5. Word list extensibility needed? (affects data structure)
