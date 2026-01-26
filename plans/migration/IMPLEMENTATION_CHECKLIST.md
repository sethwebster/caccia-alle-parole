# Implementation Checklist
**Svelte → React + Expo Web Migration**

Track progress for each phase of the migration.

---

## Phase 1: Project Setup ⬜

### Day 1-2: Foundation
- [ ] Create new Expo project
  ```bash
  npx create-expo-app caccia-parole-expo --template blank-typescript
  cd caccia-parole-expo
  ```
- [ ] Install core dependencies (Expo Router, NativeWind, etc.)
- [ ] Configure `app.json` with NativeWind plugin
- [ ] Configure `metro.config.js` with NativeWind
- [ ] Create `global.css` with Tailwind 4 import
- [ ] Set up Expo Router file structure (`app/` directory)
- [ ] Verify dev server runs: `npx expo start --web`

### Day 3: ESLint + TypeScript
- [ ] Install ESLint dependencies
- [ ] Create `.eslintrc.js` with React Native rules
- [ ] Create `.prettierrc.js`
- [ ] Configure `tsconfig.json` with path aliases
- [ ] Run `npm run lint` - should pass
- [ ] Set up pre-commit hooks (optional)

### Day 4: Testing Setup
- [ ] Install Vitest + React Testing Library
- [ ] Create `vitest.config.ts`
- [ ] Create `test/setup.ts` with mocks
- [ ] Write sample test to verify setup
- [ ] Run `npm test` - should pass

---

## Phase 2: Data & Types ⬜

### Day 1: Pure Logic Migration
- [ ] Create `lib/` directory structure
- [ ] Copy `lib/data/word-data.ts` verbatim
- [ ] Copy `lib/data/wordle-data.ts` verbatim
- [ ] Copy `lib/data/wordle-valid-words.ts` verbatim
- [ ] Copy `lib/types/index.ts` verbatim
- [ ] Copy `lib/utils/gridGenerator.ts` verbatim
- [ ] Copy `lib/utils/wordDetection.ts` verbatim
- [ ] Update import paths if needed
- [ ] Run `npx tsc --noEmit` - should pass

### Day 2: Unit Tests for Utils
- [ ] Write tests for `gridGenerator.ts`
  - [ ] Test grid size generation (10×10, 14×14, 18×18)
  - [ ] Test word placement in all 8 directions
  - [ ] Test decoy word generation (hard mode)
  - [ ] Test accent normalization
- [ ] Write tests for `wordDetection.ts`
  - [ ] Test `getCellsBetween` for straight lines
  - [ ] Test word extraction from cells
  - [ ] Test word matching with accents
- [ ] All tests pass: `npm test`

---

## Phase 3: State Management ⬜

### Day 1: Zustand Setup
- [ ] Install Zustand + AsyncStorage dependencies
- [ ] Create `lib/stores/word-search.ts`
  - [ ] Implement state interface
  - [ ] Implement `setGame` action
  - [ ] Implement `markWordFound` action
  - [ ] Implement `reset` action
  - [ ] Configure persist middleware with Set serialization
- [ ] Create `lib/stores/wordle.ts`
  - [ ] Implement state interface
  - [ ] Port seeded RNG logic (CRITICAL: preserve seed=42)
  - [ ] Port guess evaluation algorithm
  - [ ] Implement `addLetter`, `deleteLetter`, `submitGuess`
  - [ ] Configure persist middleware with date-based reset
- [ ] Test stores in isolation

### Day 2: Toast Context
- [ ] Create `lib/stores/toast.tsx`
  - [ ] Implement ToastContext
  - [ ] Implement ToastProvider component
  - [ ] Implement `useToast` hook
  - [ ] Implement auto-dismiss logic
- [ ] Write tests for toast state management

---

## Phase 4: UI Components ⬜

### Day 1: Basic Components
- [ ] Create `lib/components/ui/Button.tsx`
  - [ ] Implement variants (primary, outline, ghost)
  - [ ] Implement disabled state
  - [ ] Apply NativeWind classes
- [ ] Create `lib/components/ui/Card.tsx`
  - [ ] Simple View wrapper with card styling
- [ ] Create `lib/components/ui/Modal.tsx`
  - [ ] Use React Native Modal
  - [ ] Implement backdrop with blur
  - [ ] Implement press-outside-to-close
- [ ] Test components render correctly

### Day 2-3: TopNav & Toast
- [ ] Create `lib/components/ui/TopNav.tsx`
  - [ ] Implement menu state
  - [ ] Add navigation links (Expo Router Link)
  - [ ] Apply responsive styles
- [ ] Create `lib/components/ui/Toast.tsx`
  - [ ] Render toasts from context
  - [ ] Implement enter/exit animations (Reanimated)
  - [ ] Position absolute top-right
  - [ ] Test toast types (success, error, warning, info)

### Day 4: Confetti
- [ ] Create `lib/components/ui/Confetti.tsx`
  - [ ] Implement web version (canvas-confetti)
  - [ ] Platform.select for conditional rendering
  - [ ] Test trigger prop works
- [ ] Download Lottie confetti animation (optional for native)
- [ ] Test confetti displays on web

---

## Phase 5: Word Search Game ⬜

### Day 1: Grid Rendering
- [ ] Create `lib/components/WordSearchGame.tsx`
- [ ] Connect to word search store
- [ ] Implement difficulty/category selection UI
- [ ] Generate grid on selection
- [ ] Render grid with cells
  - [ ] Use FlatList or map for performance
  - [ ] Memoize GridCell component
  - [ ] Apply grid layout styles
- [ ] Test grid renders for all sizes

### Day 2: Gesture Handling (Web)
- [ ] Implement pointer events for web
  - [ ] onPointerDown → start selection
  - [ ] onPointerMove → update selection
  - [ ] onPointerUp → validate word
  - [ ] setPointerCapture for smooth drag
- [ ] Implement `getCellFromPointer` helper
- [ ] Test drag-to-select on web

### Day 3: Gesture Handling (Native)
- [ ] Implement Gesture Handler Pan gesture
- [ ] Implement `getCellFromGesture` helper
- [ ] Test touch selection on mobile (via Expo Go)
- [ ] Platform.select for conditional gesture handling

### Day 4: Word Validation & Feedback
- [ ] Implement selected cell state (Set-based)
- [ ] Implement found cell state (Set-based)
- [ ] Implement flash animations (success/error)
- [ ] Connect to `checkIfWordFound` util
- [ ] Update store on valid word found
- [ ] Test word detection in all 8 directions

### Day 5: Victory Modal
- [ ] Detect when all words found
- [ ] Show victory modal with confetti
- [ ] Display score and word count
- [ ] Implement "New Game" button
- [ ] Test modal shows on game win

---

## Phase 6: Wordle Game ⬜

### Day 1: Grid & State
- [ ] Create `lib/components/WordleGame.tsx`
- [ ] Connect to Wordle store
- [ ] Render 6 guess rows
  - [ ] Render completed guesses with colors
  - [ ] Render current guess row
  - [ ] Render empty rows
- [ ] Test grid renders correctly

### Day 2: Keyboard Input (Web)
- [ ] Implement physical keyboard listener (useEffect)
  - [ ] Handle Enter → submit guess
  - [ ] Handle Backspace → delete letter
  - [ ] Handle A-Z → add letter
  - [ ] Platform.OS === 'web' guard
- [ ] Test keyboard input on web

### Day 3: On-Screen Keyboard
- [ ] Create WordleKeyboard component
  - [ ] Render 3 rows of keys
  - [ ] Style ENTER and ⌫ keys wider
  - [ ] Connect to store actions
  - [ ] Apply keyboard state colors (correct/present/absent)
- [ ] Test on-screen keyboard works

### Day 4: Tile Animations
- [ ] Implement flip animation with Reanimated
- [ ] Stagger animation by column index (×100ms delay)
- [ ] Apply on latest guess only
- [ ] Test animations smooth at 60fps

### Day 5: Victory/Loss Modal & Share
- [ ] Detect game end (won/lost)
- [ ] Show modal with word + definition
- [ ] Implement confetti on win
- [ ] Implement share results
  - [ ] Generate emoji grid
  - [ ] Platform.select for clipboard API
  - [ ] Show success toast
- [ ] Test share functionality

---

## Phase 7: Pages & Layout ⬜

### Day 1: Root Layout
- [ ] Create `app/_layout.tsx`
  - [ ] Wrap with GestureHandlerRootView
  - [ ] Add ToastProvider
  - [ ] Add TopNav
  - [ ] Add Stack navigator
  - [ ] Add Toast component
  - [ ] Add Plausible analytics scripts (web only)
  - [ ] Add Head with meta tags
- [ ] Test navigation between pages

### Day 2: Pages
- [ ] Create `app/index.tsx` (home/game selector)
  - [ ] Title and description
  - [ ] Link to /caccia (Word Search)
  - [ ] Link to /parola (Wordle)
  - [ ] Apply card styling
- [ ] Create `app/caccia.tsx`
  - [ ] Render WordSearchGame component
- [ ] Create `app/parola.tsx`
  - [ ] Render WordleGame component
- [ ] Test navigation works, state persists

---

## Phase 8: Styling & Animations ⬜

### Day 1-2: Design System in global.css
- [ ] Port all CDS color tokens
- [ ] Port spacing tokens
- [ ] Port border radius tokens
- [ ] Port shadow tokens
- [ ] Port typography classes (heading-1, heading-2, etc.)
- [ ] Port button classes
- [ ] Port card classes
- [ ] Port grid cell classes
- [ ] Port Wordle tile classes
- [ ] Port Wordle keyboard classes

### Day 3: Dark Mode
- [ ] Add dark mode color tokens
- [ ] Test dark mode on web (system preference)
- [ ] Test dark mode on mobile

### Day 4: Animations
- [ ] Grid cell flash animations (success/error)
- [ ] Wordle tile flip animations
- [ ] Modal enter/exit animations
- [ ] Toast enter/exit animations
- [ ] Test all animations at 60fps

### Day 5: Responsive Design
- [ ] Test mobile viewport (375×667)
- [ ] Test tablet viewport (768×1024)
- [ ] Test desktop viewport (1920×1080)
- [ ] Adjust grid cell sizes for mobile
- [ ] Adjust Wordle tile sizes for mobile

---

## Phase 9: Testing ⬜

### Day 1: Word Search Tests
- [ ] Test category selection
- [ ] Test difficulty selection
- [ ] Test grid generation
- [ ] Test word placement
- [ ] Test word detection
- [ ] Test score calculation
- [ ] Test victory condition
- [ ] Test state persistence

### Day 2: Wordle Tests
- [ ] Test daily puzzle generation
- [ ] Test letter input
- [ ] Test guess validation
- [ ] Test guess evaluation
- [ ] Test keyboard state updates
- [ ] Test victory/loss conditions
- [ ] Test share functionality
- [ ] Test state persistence

### Day 3: Component Tests
- [ ] Test Button variants
- [ ] Test Modal open/close
- [ ] Test Toast display/dismiss
- [ ] Test TopNav navigation
- [ ] Test Confetti trigger

### Day 4: Integration Tests
- [ ] Test full Word Search game flow
- [ ] Test full Wordle game flow
- [ ] Test navigation between games
- [ ] Test state persists across navigation
- [ ] Test AsyncStorage reads/writes

### Day 5: Performance Testing
- [ ] Profile grid rendering (should be <100ms)
- [ ] Profile gesture response (should be <16ms)
- [ ] Check bundle size (should be <500KB gzipped)
- [ ] Test on low-end device (optional)

---

## Phase 10: Deployment ⬜

### Day 1: Build Configuration
- [ ] Create `wrangler.toml` with routes
- [ ] Create `_worker.js` for redirects (www → non-www)
- [ ] Configure custom domain (cacciaparole.com)
- [ ] Test production build: `npx expo export --platform web`
- [ ] Verify `dist/` output

### Day 2: Cloudflare Workers Deployment
- [ ] Deploy to Workers: `wrangler deploy`
- [ ] Test on staging URL
- [ ] Verify custom domain works (cacciaparole.com)
- [ ] Verify www redirect works
- [ ] Verify HTTPS enabled

### Day 3: Analytics Verification
- [ ] Verify Plausible script loads
- [ ] Test page view tracking
- [ ] Test custom events (game started, won, etc.)
- [ ] Check Plausible dashboard for data

### Day 4: Production Validation
- [ ] Test all features on production
- [ ] Test on Chrome, Safari, Firefox
- [ ] Test on iOS Safari, Chrome Android
- [ ] Test dark mode
- [ ] Test offline behavior (AsyncStorage)
- [ ] Monitor for errors

### Day 5: Documentation & Handoff
- [ ] Update README with new tech stack
- [ ] Document deployment process
- [ ] Document development workflow
- [ ] Tag release: `git tag -a v2.0.0`
- [ ] Push to main: `git push origin main --tags`

---

## Post-Migration ⬜

### Optional Enhancements
- [ ] Add Vitest coverage reports
- [ ] Set up GitHub Actions CI/CD
- [ ] Add E2E tests with Playwright (optional)
- [ ] Optimize bundle size further
- [ ] Add more Plausible custom events
- [ ] Implement service worker for PWA (optional)
- [ ] Start native mobile app work (Phase 2)

---

## Progress Tracking

**Overall Status:** Not Started

**Completion:**
- Phase 1: 0/7 tasks (0%)
- Phase 2: 0/9 tasks (0%)
- Phase 3: 0/9 tasks (0%)
- Phase 4: 0/11 tasks (0%)
- Phase 5: 0/18 tasks (0%)
- Phase 6: 0/18 tasks (0%)
- Phase 7: 0/6 tasks (0%)
- Phase 8: 0/17 tasks (0%)
- Phase 9: 0/20 tasks (0%)
- Phase 10: 0/16 tasks (0%)

**Total:** 0/131 tasks (0%)

---

## Notes

- Mark tasks with `[x]` as completed
- Update progress tracking section regularly
- Document any deviations from plan
- Track time spent per phase
- Note any blockers or issues encountered
