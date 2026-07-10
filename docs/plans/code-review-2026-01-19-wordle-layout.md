# Wordle Layout CSS Code Review
**Date:** 2026-01-19
**File:** `/Users/sethwebster/Development/caccia-alle-parole/styles.css` (lines 395-708)
**Issue:** "keyboard is far away from boxes and the padding/margin remains"

---

## Executive Summary

The Wordle layout suffers from **conflicting containment strategies** and **overconstrained height calculations**. The fundamental problem: the layout tries to achieve viewport-fit using `height: 100vh` on `.wordle-container` while being nested inside a `cds-container` that has padding and is offset by an 80px fixed nav. The grid and keyboard are then height-calculated against this flawed parent, creating wasted vertical space.

---

## Critical Issues

### 1. Double Containment Conflict (CRITICAL)
**Location:** `index.html` lines 152-188, `styles.css` lines 396-406

**Problem:** `.wordle-container` is nested inside `.cds-container.app-content` which:
- Has `padding-left/right: var(--cds-space-container-padding)` (16px each side)
- Has `max-width: 1200px`
- Has `padding-top: 80px` for fixed nav offset

Meanwhile `.wordle-container` sets `max-width: 500px` and `margin: 0 auto`, creating centered content with additional horizontal dead space.

**Impact:** The grid is constrained to 350px max-width inside a 500px container inside a padded 1200px container. On a 414px mobile screen, you have ~16px padding from cds-container + 8px padding from wordle-game = 24px each side, leaving only 366px for content that's further constrained to 350px max. This explains the "wide left/right margins" complaint.

**Solution:** Either:
1. Have `.wordle-container` break out of `.cds-container` entirely and position fixed/absolute
2. Remove `.wordle-container` max-width constraint and let grid sizing control everything
3. Make `.wordle-container` use `100vw` width with negative margins to counter parent padding

### 2. Viewport Height Calculation Ignores Fixed Nav (CRITICAL)
**Location:** `styles.css` line 402

```css
.wordle-container {
    height: 100vh;  /* WRONG: doesn't account for 80px fixed nav + 64px nav bar */
}
```

**Problem:** The wordle container claims 100vh but sits under a fixed 64px nav with 80px padding-top offset. This means the actual available height is `100vh - 80px`, but the container still calculates as 100vh, causing overflow.

**Impact:** On mobile, content clips or scrolls unexpectedly. The keyboard may be pushed below the fold or cause body scroll.

**Solution:**
```css
.wordle-container {
    height: calc(100vh - 80px);
    /* Or better: use 100dvh (dynamic viewport height) for mobile: */
    height: 100dvh;
    height: calc(100dvh - 80px);
}
```

### 3. Conflicting Grid Height Strategies (CRITICAL)
**Location:** `styles.css` lines 455-465 (desktop) and 652-658 (mobile)

```css
/* Desktop */
.wordle-grid {
    max-width: 350px;
    height: auto;
    aspect-ratio: 5 / 6;
}

/* Mobile */
.wordle-grid {
    max-width: 100%;
    max-height: calc(100vh - 65px - 210px);  /* Magic numbers, ignores actual layout */
}
```

**Problem:**
- Desktop uses `aspect-ratio: 5/6` which is correct for a 5x6 grid
- Mobile overrides with `max-height` using magic `65px` (header) + `210px` (keyboard) but ignores the 80px app-content padding-top
- The `65px` is the wordle-header but the layout has TWO headers (top-nav at 64px + wordle-header at 65px)
- Mobile calc should be: `100vh - 80px(app-content) - 65px(wordle-header) - 200px(keyboard) = 100vh - 345px`

**Solution:** Stop using magic numbers. Use flexbox to let content distribute naturally:

```css
.wordle-container {
    display: flex;
    flex-direction: column;
    height: calc(100dvh - 80px); /* Account for fixed nav offset */
}

.wordle-header { flex-shrink: 0; } /* Fixed height */
.wordle-keyboard { flex-shrink: 0; } /* Fixed height */
.wordle-game { flex: 1; min-height: 0; } /* Take remaining space */
```

---

## Architecture Concerns

### 4. Grid Doesn't Use Available Space
**Location:** `styles.css` lines 445-453

```css
.wordle-game {
    flex: 1 1 auto;
    display: flex;
    align-items: flex-start;  /* <-- PROBLEM */
    justify-content: center;
    padding: 10px 8px 0 8px;
    overflow: visible;
    min-height: 300px;
}
```

**Problem:** `align-items: flex-start` pins the grid to the top, leaving empty space below. Combined with a fixed `max-width: 350px` on the grid, the grid cannot expand to fill available vertical space.

**Impact:** Even when there's room, the grid stays small, creating the "far away from keyboard" effect.

**Solution:**
```css
.wordle-game {
    flex: 1 1 auto;
    display: flex;
    align-items: center;  /* Center vertically in available space */
    justify-content: center;
    padding: 10px 8px;
    overflow: hidden;
    min-height: 0; /* Allow flex shrinking */
}
```

### 5. Hardcoded 350px Max-Width is Too Restrictive
**Location:** `styles.css` line 460

```css
.wordle-grid {
    max-width: 350px;
}
```

**Problem:** On a 375px iPhone, after 8px + 8px padding (16px total), you have 359px available. The grid uses 350px, leaving 9px dead. On larger phones (414px), 398px available, grid uses 350px, leaving 48px dead.

**Impact:** Wasted horizontal space creates the "wide margins" perception.

**Solution:** Use percentage-based sizing with sensible constraints:
```css
.wordle-grid {
    width: 100%;
    max-width: min(350px, 100%);
    /* Or even better, let the container constrain it */
}
```

### 6. Mobile Media Query Doesn't Match Desktop Strategy
**Location:** `styles.css` lines 646-677

Desktop uses aspect-ratio sizing. Mobile throws that out and uses `max-height` pixel calculations. This creates inconsistent behavior and maintenance burden.

**Solution:** Use same flexbox distribution strategy across all breakpoints. Remove the mobile-specific `max-height` overrides.

---

## DRY Opportunities

### 7. Duplicate Height Calculations
**Location:** `styles.css` lines 649, 655

```css
.wordle-game {
    max-height: calc(100vh - 65px - 200px);
}
.wordle-grid {
    max-height: calc(100vh - 65px - 210px);  /* 10px variance, why? */
}
```

Both calculate against viewport with slightly different offsets. These should derive from CSS custom properties or let flexbox handle distribution entirely.

### 8. Padding Inconsistency
**Location:** Throughout wordle CSS

- `.wordle-game`: `padding: 10px 8px 0 8px` (desktop), `padding: 0 15px` (mobile)
- `.wordle-keyboard`: `padding: 0 8px 8px 8px` (desktop), `padding: 0 4px 4px 4px` (mobile)
- `.wordle-container`: no padding
- `.cds-container`: `padding: 16px`

Create a CSS variable for consistent edge padding:
```css
.wordle-container {
    --wordle-edge-padding: 8px;
}
@media (max-width: 640px) {
    .wordle-container {
        --wordle-edge-padding: 4px;
    }
}
```

---

## Maintenance Improvements

### 9. Magic Number Comments Missing
**Location:** `styles.css` lines 413, 524, 649, 655

Numbers like `65px`, `200px`, `210px`, `300px` appear without explanation. The root `:root` has a comment for `--header-controls-height: 420px` but this isn't used in wordle layout.

Add comments or use custom properties:
```css
.wordle-container {
    --wordle-header-height: 65px;
    --wordle-keyboard-height: 200px;
}
```

### 10. min-height: 300px is Arbitrary
**Location:** `styles.css` line 452

```css
.wordle-game {
    min-height: 300px;
}
```

Where does 300px come from? This should be calculated from minimum usable tile size (e.g., 6 rows * 48px min tile + gaps).

### 11. Mobile min-height: 190px on Keyboard
**Location:** `styles.css` line 675

```css
.wordle-keyboard {
    min-height: 190px;
}
```

This conflicts with the desktop `min-height: 200px`. The 10px difference suggests ad-hoc fixes rather than systematic design.

---

## Nitpicks

### 12. grid-gap vs gap
**Location:** `styles.css` lines 458, 471

Uses deprecated `grid-gap` property. Modern syntax is just `gap`.

### 13. overflow: visible on flex child
**Location:** `styles.css` line 451

```css
.wordle-game {
    overflow: visible;
}
```

This can cause content to bleed outside bounds. Should be `hidden` or `clip`.

### 14. Inconsistent Font Fallback
**Location:** `styles.css` line 404

```css
.wordle-container {
    font-family: 'Poppins', sans-serif;
}
```

Duplicates the body font-family. Remove to inherit.

---

## Strengths

1. **Correct aspect-ratio usage** on grid (5/6 for 5x6 grid) and tiles (1/1 for squares)
2. **flex-shrink: 0** on keyboard prevents it from collapsing
3. **touch-action: manipulation** on keyboard for proper mobile handling
4. **Proper animation keyframes** with transform and opacity
5. **Good use of CSS grid** for tile layout (`grid-template-rows: repeat(6, 1fr)`)

---

## Recommended Fix

Here's the core layout fix:

```css
/* Break out of cds-container constraints */
.wordle-container {
    position: fixed;
    top: 64px; /* Below fixed nav */
    left: 0;
    right: 0;
    bottom: 0;
    max-width: none;
    margin: 0;
    display: flex;
    flex-direction: column;
    background-color: white;
}

.wordle-header {
    flex-shrink: 0;
    height: 65px;
}

.wordle-game {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    min-height: 0;
    overflow: hidden;
}

.wordle-grid {
    width: 100%;
    max-width: 350px;
    aspect-ratio: 5 / 6;
    margin: 0;
}

.wordle-keyboard {
    flex-shrink: 0;
    padding: 8px;
    /* Remove min-height - let content size it */
}
```

This approach:
1. Removes the nested container conflicts
2. Uses proper flexbox distribution instead of viewport calculations
3. Lets keyboard and header keep natural size while game area flexes
4. Eliminates magic number viewport math

---

## Questions to Resolve

- Should wordle mode hide the top-nav entirely?
- Is 350px grid max-width intentional UX decision or just a guess?
- Should wordle be a separate route/page vs hidden div toggle?
