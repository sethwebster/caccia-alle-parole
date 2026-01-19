# CDS Integration Code Review - 2026-01-19

## Review Scope
- `/Users/sethwebster/Development/caccia-alle-parole/index.html`
- `/Users/sethwebster/Development/caccia-alle-parole/game.js`
- `/Users/sethwebster/Development/caccia-alle-parole/wordle.js`
- `/Users/sethwebster/Development/caccia-alle-parole/styles.css`
- CDS design system files (`/cds/**/*.css`)

---

## Critical Issues

### 1. Modal Component Missing from CDS CSS Imports

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/index.html` lines 10-20

**Problem:** The HTML imports multiple CDS component stylesheets but `modals.css` is NOT included, yet the HTML uses CDS modal classes (`cds-modal`, `cds-modal__backdrop`, `cds-modal__content`, etc.).

```html
<!-- Current imports - MISSING modals.css -->
<link rel="stylesheet" href="cds/components/buttons.css">
<link rel="stylesheet" href="cds/components/cards.css">
<link rel="stylesheet" href="cds/components/inputs.css">
<link rel="stylesheet" href="cds/components/toasts.css">
<link rel="stylesheet" href="cds/components/grid.css">
```

**Impact:** Modal styling will not work. The modals rely on CSS classes like `.cds-modal`, `.cds-modal--open`, `.cds-modal__backdrop` which are defined in `cds/components/modals.css`. Without this import, modals will:
- Not have proper z-index layering
- Not animate visibility/opacity transitions
- Not have backdrop blur effects
- Not properly position/center content

**Solution:** Add the missing import:
```html
<link rel="stylesheet" href="cds/components/modals.css">
```

---

### 2. Modal Backdrop Click Handler Uses Wrong Class

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/game.js` lines 184-188

**Problem:** The backdrop click handler checks for `cds-modal__backdrop` but the HTML structure nests `.cds-modal__backdrop` as a separate div inside `.cds-modal`. The event target comparison may not work correctly because:

1. The backdrop div is a sibling of modal content, not a wrapper
2. Clicking the backdrop area might propagate events differently

```javascript
this.definitionsModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('cds-modal__backdrop')) {
        this.hideDefinitionModal();
    }
});
```

**Current HTML Structure:**
```html
<div id="definitions-modal" class="cds-modal cds-hidden">
    <div class="cds-modal__backdrop"></div>  <!-- Sibling, not wrapper -->
    <div class="cds-modal__content">...</div>
</div>
```

**Impact:** Clicking outside the modal content (on the backdrop) may not close the modal as expected.

**Solution:** Either:
1. Check if click target is the modal container itself OR the backdrop:
```javascript
this.definitionsModal.addEventListener('click', (e) => {
    if (e.target === this.definitionsModal ||
        e.target.classList.contains('cds-modal__backdrop')) {
        this.hideDefinitionModal();
    }
});
```
2. Or ensure the backdrop covers the full modal area (CSS fix)

---

### 3. Potential Race Condition in Modal Show/Hide Timing

**Location:**
- `/Users/sethwebster/Development/caccia-alle-parole/game.js` lines 395-402 (showDefinition, hideDefinitionModal)
- `/Users/sethwebster/Development/caccia-alle-parole/wordle.js` lines 264-283 (showVictoryModal, hideVictoryModal)

**Problem:** The show/hide pattern uses `setTimeout` for CSS transition coordination but doesn't guard against rapid open/close cycles:

```javascript
// Show pattern
showDefinition(wordData) {
    // ...
    this.definitionsModal.classList.remove('cds-hidden');
    setTimeout(() => this.definitionsModal.classList.add('cds-modal--open'), 10);
}

// Hide pattern
hideDefinitionModal() {
    this.definitionsModal.classList.remove('cds-modal--open');
    setTimeout(() => this.definitionsModal.classList.add('cds-hidden'), 200);
}
```

**Impact:** If user rapidly clicks show/hide:
1. `cds-hidden` removed
2. Before 10ms timeout fires, hide is called
3. `cds-modal--open` removed
4. 200ms timeout fires, adds `cds-hidden`
5. 10ms timeout fires, adds `cds-modal--open`
6. Modal is now hidden but has `cds-modal--open` class = broken state

**Solution:** Clear timeouts and use a state guard:
```javascript
showDefinition(wordData) {
    if (this.modalTimeout) clearTimeout(this.modalTimeout);
    this.definitionsModal.classList.remove('cds-hidden');
    this.modalTimeout = setTimeout(() => {
        this.definitionsModal.classList.add('cds-modal--open');
        this.modalTimeout = null;
    }, 10);
}

hideDefinitionModal() {
    if (this.modalTimeout) clearTimeout(this.modalTimeout);
    this.definitionsModal.classList.remove('cds-modal--open');
    this.modalTimeout = setTimeout(() => {
        this.definitionsModal.classList.add('cds-hidden');
        this.modalTimeout = null;
    }, 200);
}
```

---

## Architecture Concerns

### 1. Duplicate Hidden Class Definitions

**Location:**
- `/Users/sethwebster/Development/caccia-alle-parole/styles.css` line 63-65
- `/Users/sethwebster/Development/caccia-alle-parole/cds/utilities/layout.css` line 14

**Problem:** Two different hidden class implementations exist:

```css
/* styles.css */
.hidden {
    display: none !important;
}

/* cds/utilities/layout.css */
.cds-hidden { display: none; }
```

The codebase uses `cds-hidden` in HTML but the legacy `.hidden` class with `!important` remains. This creates:
1. Potential specificity conflicts
2. Confusion about which class to use
3. Dead code

**Solution:** Remove `.hidden` from `styles.css` since the codebase has migrated to `cds-hidden`.

---

### 2. CSS Token Mapping Creates Indirection Layer

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/styles.css` lines 1-33

**Problem:** The custom properties in `:root` re-map CDS tokens to legacy variable names:

```css
:root {
    --primary: var(--cds-color-primary);
    --secondary: var(--cds-color-secondary);
    /* ... */
}
```

Then the styles use the legacy names (`--primary`, `--secondary`) rather than CDS tokens directly.

**Impact:**
1. Extra indirection = harder to trace where values come from
2. If CDS tokens change, mappings may become stale
3. New developers see two naming conventions

**Recommendation:** Either:
1. Use CDS tokens directly: `var(--cds-color-primary)` throughout styles.css
2. Or document the mapping rationale and commit to maintaining it

---

### 3. Mixed Styling Approaches for Same Elements

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/index.html` vs `/Users/sethwebster/Development/caccia-alle-parole/styles.css`

**Problem:** Mode selector cards use CDS classes in HTML but custom styles in CSS:

**HTML:**
```html
<button class="cds-card cds-card--interactive mode-card" data-mode="word-search">
```

**CSS (styles.css):**
```css
.mode-card {
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    padding: 32px 24px;
    /* ... overrides CDS card defaults */
}
```

**Impact:** The CDS card component applies its own padding, border-radius, background. The `.mode-card` class then overrides these. This creates:
1. Wasted CSS specificity battles
2. Unclear what the actual rendered style will be
3. Changes to CDS card component may have unintended effects

**Solution:** Either:
1. Use only CDS card classes and extend via BEM modifier: `.cds-card--mode`
2. Or don't use `cds-card` class and style `.mode-card` independently

---

### 4. Wordle Component Bypasses CDS System

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/styles.css` lines 395-710

**Problem:** The entire Wordle section uses hardcoded colors rather than CDS tokens:

```css
.wordle-container {
    background-color: white;  /* Not var(--cds-color-surface) */
}

.wordle-tile.tile-correct {
    background-color: #6aaa64;  /* Not var(--cds-color-success) */
}

.wordle-tile.tile-present {
    background-color: #c9b458;  /* Hardcoded */
}
```

**Impact:**
1. Wordle won't respect dark mode when CDS implements it
2. Color inconsistency between games
3. Maintenance burden of two color systems

**Solution:** Map Wordle colors to CDS tokens:
```css
.wordle-tile.tile-correct {
    background-color: var(--cds-color-success);
}
```

---

## DRY Opportunities

### 1. Modal Show/Hide Pattern Duplicated 4 Times

**Location:**
- `game.js` lines 395-401 (showDefinition/hideDefinitionModal)
- `game.js` lines 404-413 (showVictoryModal/hideVictoryModal)
- `wordle.js` lines 264-278 (showVictoryModal)
- `wordle.js` lines 280-283 (hideVictoryModal)

**Problem:** Same show/hide pattern repeated:

```javascript
// Repeated pattern
showModal() {
    modal.classList.remove('cds-hidden');
    setTimeout(() => modal.classList.add('cds-modal--open'), 10);
}

hideModal() {
    modal.classList.remove('cds-modal--open');
    setTimeout(() => modal.classList.add('cds-hidden'), 200);
}
```

**Solution:** Extract to shared utility:

```javascript
// utils/modal.js
export function showModal(element) {
    element.classList.remove('cds-hidden');
    setTimeout(() => element.classList.add('cds-modal--open'), 10);
}

export function hideModal(element) {
    element.classList.remove('cds-modal--open');
    setTimeout(() => element.classList.add('cds-hidden'), 200);
}
```

---

### 2. Keyboard Event Handler Pattern Repeated

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/wordle.js` lines 70-83

**Problem:** Physical keyboard handling could be extracted for reuse:

```javascript
handlePhysicalKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Enter') {
        e.preventDefault();
        this.handleKeyInput('ENTER');
    } else if (e.key === 'Backspace') {
        e.preventDefault();
        this.handleKeyInput('BACKSPACE');
    } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        this.handleKeyInput(e.key.toUpperCase());
    }
}
```

This is a generic "letter input" handler that could be reused if other games need keyboard input.

---

### 3. Duplicate `@keyframes popIn` Animation

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/styles.css`
- Lines 343-346 (word search grid)
- Lines 612-616 (wordle)

**Problem:** Two different `popIn` animations defined:

```css
/* First definition (line 343) */
@keyframes popIn {
    0% { transform: scale(0.5); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}

/* Second definition (line 612) */
@keyframes popIn {
    0% { transform: scale(0.8); opacity: 0; }
    40% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
}
```

**Impact:** The second definition overwrites the first. Word search grid cells may not animate as intended.

**Solution:** Rename one or consolidate:
```css
@keyframes cds-pop-in { /* word search version */ }
@keyframes wordle-pop-in { /* wordle version */ }
```

---

## Maintenance Improvements

### 1. Missing Body Scroll Lock When Modal Open

**Location:** CDS modals.css defines `body.cds-modal-open { overflow: hidden; }` but this class is never applied.

**Problem:** When a modal opens, the body can still scroll underneath, causing jarring UX on mobile.

**Solution:** Add body class toggling to modal show/hide:
```javascript
showVictoryModal() {
    document.body.classList.add('cds-modal-open');
    this.victoryModal.classList.remove('cds-hidden');
    // ...
}

hideVictoryModal() {
    document.body.classList.remove('cds-modal-open');
    // ...
}
```

---

### 2. Inconsistent Element Selection Patterns

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/game.js`

**Problem:** Mixed patterns for getting elements:

```javascript
// Pattern 1: stored in initializeElements (good)
this.definitionsModal = document.getElementById('definitions-modal');

// Pattern 2: queried inline (inconsistent)
document.querySelector('.controls').classList.remove('cds-hidden');
document.querySelector('.header').classList.add('cds-hidden');

// Pattern 3: queried with ID inline
document.getElementById('final-score').textContent = this.score;
```

**Impact:**
1. Multiple DOM queries for same elements = performance waste
2. Harder to trace which elements are used where
3. Potential null reference errors if element doesn't exist

**Solution:** Centralize all element references in `initializeElements()` and use them throughout.

---

### 3. Magic Numbers in CSS

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/styles.css`

**Problem:** Many hardcoded pixel values that should use CDS spacing tokens:

```css
.header {
    margin-bottom: 32px;  /* Should be var(--cds-space-8) */
    padding: 24px 0;      /* Should be var(--cds-space-6) 0 */
}

.mode-card {
    padding: 32px 24px;   /* Mix of values */
}

.wordle-header {
    height: 65px;         /* Magic number */
}
```

**Solution:** Replace with CDS spacing tokens where applicable.

---

### 4. Error Messages Not Internationalized

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/wordle-game.js` lines 68-74

**Problem:** Error messages are hardcoded in Italian:

```javascript
if (this.currentGuess.length !== this.wordLength) {
    return { success: false, error: 'Parola troppo corta' };
}

if (!isValidWord(this.currentGuess)) {
    return { success: false, error: 'Parola non valida' };
}
```

**Impact:** No i18n infrastructure. If app needs to support multiple languages, strings are scattered.

**Recommendation:** Consider extracting strings to a central location for future i18n support.

---

### 5. Missing Accessibility Attributes

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/index.html`

**Problems:**
1. Modal close buttons have no aria-label:
```html
<button class="cds-modal__close modal-close">&times;</button>
```

2. Mode selector cards are buttons but lack role/aria:
```html
<button class="cds-card cds-card--interactive mode-card" data-mode="word-search">
```

3. Wordle keyboard buttons lack aria-label for special keys:
```html
<!-- Generated in JS, but should have aria-label="Enter" -->
```

**Solution:** Add accessibility attributes:
```html
<button class="cds-modal__close modal-close" aria-label="Chiudi">
```

---

## Nitpicks

### 1. Inline Styles in HTML

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/index.html` lines 136-137

```html
<div class="header-right" style="display: flex; gap: 8px;">
    <button id="wordle-share" ... style="display: none;">
```

Should use CDS utility classes:
```html
<div class="header-right cds-flex cds-gap-2">
    <button id="wordle-share" class="... cds-hidden">
```

---

### 2. Inconsistent Button Styling Between Games

The word search "Nuova Partita" button uses CDS:
```html
<button id="new-game-btn" class="cds-button cds-button--primary cds-w-full">
```

But Wordle header buttons use custom classes:
```html
<button id="wordle-new-game" class="wordle-header-btn">
```

Consider making header buttons use CDS icon button pattern.

---

### 3. CSS Comment Quality

**Location:** `/Users/sethwebster/Development/caccia-alle-parole/styles.css` lines 274-279

```css
/* --- Word Search Grid --- */
.game-container {
```

Comments are minimal. Consider documenting:
- Why certain viewport calculations exist
- What the `--header-controls-height` magic number represents
- Layout constraints and their rationale

---

## Strengths

### 1. Clean Component Architecture
The separation between `WordleGame` (logic) and `WordleUI` (presentation) is excellent. Game state is managed separately from DOM manipulation.

### 2. Good CDS Token Foundation
The CDS design system has well-organized tokens with semantic naming. Color, spacing, and typography scales are consistent.

### 3. Responsive Grid Implementation
The word search grid uses `clamp()` for responsive font sizing and CSS Grid for layout, which scales well across devices.

### 4. Event Delegation for Keyboard
The virtual keyboard uses event delegation on the container rather than individual button listeners, which is performant.

### 5. URL-Based State Management
`GameManager` properly manages URL hash state for deep linking to game modes, with `popstate` handling for browser navigation.

---

## Summary

**Must Fix Before Production:**
1. Add missing `cds/components/modals.css` import
2. Fix modal backdrop click detection
3. Address race condition in modal show/hide timing

**Should Address:**
1. Remove duplicate `.hidden` class
2. Consolidate `@keyframes popIn` animations
3. Add body scroll lock for modals
4. Centralize element references

**Consider for Future:**
1. Migrate Wordle colors to CDS tokens for dark mode support
2. Extract modal utilities to shared module
3. Add i18n infrastructure
4. Improve accessibility attributes

---

**Review completed:** 2026-01-19
