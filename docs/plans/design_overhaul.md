# Caccia alle Parole - Design Overhaul Plan

## Objectives
1.  **Mobile First**: Ensure all game modes (Word Search, Wordle) work perfectly on mobile devices (e.g., iPhone X 375px width).
2.  **Visual Polish**: specific focus on "Premium" aesthetics (modern typography, subtle shadows, smooth animations, cohesive color palette).
3.  **Preserve Gameplay**: Keep the underlying game logic intact.

## Proposed Changes

### 1. Core Styles (`styles.css`)
-   **Color Palette**: Refine `italian-red` and `italian-green` to be slightly deeper/richer. Add a proper neutral scale (slate/gray).
-   **Typography**: Stick with Poppins but adjust weights for better hierarchy.
-   **Structure**:
    -   Switch main `container` to be full-width/height on mobile, card-like on desktop.
    -   Use `clamp()` for responsive font sizes.
    -   Remove fixed widths (max-width is fine, but width should be 100%).

### 2. Word Search (`game.js` & `styles.css`)
-   **Grid Rendering**:
    -   **Change**: In `game.js`, remove `48px` fixed size. Use `repeat(${size}, 1fr)`.
    -   **CSS**: Ensure the `.word-grid` container has a `max-width` of `100vw - padding` and maintains aspect ratio.
    -   **Touch Interaction**: Ensure cells are large enough to tap, or use drag selection (which seems to be implemented in `word-selector.js`, need to verify it works with touch events). *Self-correction: The current request doesn't explicitly ask for touch event debugging, but visual sizing is critical.*
-   **Word List**:
    -   Move below grid on mobile.
    -   Use a flex-wrap chip design instead of a list for better space usage on mobile.

### 3. Wordle (`styles.css`)
-   **Grid**: Make it responsive (max height/width constrained by viewport).
-   **Keyboard**:
    -   Optimize key sizes for mobile (reduce margins/gaps).
    -   Ensure the "Enter" and "Backspace" keys are prominent.

### 4. Code Changes
-   **`game.js`**: Modify `renderGrid` to use `1fr` instead of `48px`.
-   **`styles.css`**: Complete rewrite/heavy modification of existing styles.

## Execution Steps
1.  **Modify `game.js`**: Remove hardcoded grid dimensions.
2.  **Rewrite `styles.css`**: Implement the new design system (Mobile First).
3.  **Verify**: Run browser subagent to check mobile layout 375px width.
