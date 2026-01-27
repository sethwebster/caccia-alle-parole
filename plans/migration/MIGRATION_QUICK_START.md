# Migration Quick Start Guide
**Svelte → React + Expo Web + NativeWind**

## TL;DR

Convert Italian word game from SvelteKit to Expo with zero functionality loss.

**Time:** 3-4 weeks | **Risk:** Low | **Bundle Impact:** +150KB gzipped

---

## Quick Start Commands

```bash
# 1. Create new project
npx create-expo-app caccia-parole-expo --template blank-typescript
cd caccia-parole-expo

# 2. Install core deps
npx expo install expo-router react-native-web react-dom expo-font
npm install nativewind@next tailwindcss@4 react-native-css
npm install zustand @react-native-async-storage/async-storage
npm install react-native-gesture-handler react-native-reanimated
npm install canvas-confetti lottie-react-native expo-clipboard

# 3. Configure NativeWind
# Add to app.json: { "expo": { "plugins": ["nativewind"] } }

# 4. Start dev
npx expo start --web
```

---

## Architecture at a Glance

| Component | Svelte | React + Expo |
|-----------|--------|--------------|
| **State** | Svelte stores | Zustand + AsyncStorage |
| **Routing** | SvelteKit routes | Expo Router (file-based) |
| **Styling** | Tailwind 4 + CSS | NativeWind v5 + Tailwind 4 |
| **Gestures** | Pointer events | Gesture Handler |
| **Animations** | CSS keyframes | Reanimated |
| **Storage** | localStorage | AsyncStorage |
| **Deployment** | Cloudflare Workers | Static export → any host |

---

## Critical Files to Migrate

### 1. Pure Logic (Copy Verbatim)
- ✅ `lib/data/` → all word data files
- ✅ `lib/types/` → TypeScript definitions
- ✅ `lib/utils/` → grid generation, word detection

### 2. State Management (Rewrite as Zustand)
- 🔄 `lib/stores/wordSearch.ts` → Zustand store
- 🔄 `lib/stores/wordle.ts` → Zustand store (preserve seeded RNG!)
- 🔄 `lib/stores/toast.ts` → React Context

### 3. Components (Convert to React)
- 🔄 `WordSearchGame.svelte` → `WordSearchGame.tsx`
- 🔄 `WordleGame.svelte` → `WordleGame.tsx`
- 🔄 `ui/` components → React components

### 4. Pages (Expo Router)
- 🔄 `routes/+page.svelte` → `app/index.tsx`
- 🔄 `routes/caccia/+page.svelte` → `app/caccia.tsx`
- 🔄 `routes/parola/+page.svelte` → `app/parola.tsx`
- 🔄 `routes/+layout.svelte` → `app/_layout.tsx`

---

## Key Translation Patterns

### State Management
```typescript
// BEFORE (Svelte)
const wordSearchStore = createWordSearchStore();
$wordSearchStore.score

// AFTER (React + Zustand)
const { score } = useWordSearchStore();
```

### Reactivity
```typescript
// BEFORE (Svelte)
$: isGameWon = foundCount === totalWords;

// AFTER (React)
const isGameWon = useMemo(() =>
  foundCount === totalWords,
  [foundCount, totalWords]
);
```

### Components
```typescript
// BEFORE (Svelte)
<div class="cds-card">
  {#if isActive}
    <button onclick={handleClick}>Click</button>
  {/if}
</div>

// AFTER (React + NativeWind)
<View className="cds-card">
  {isActive && (
    <Pressable onPress={handleClick}>
      <Text>Click</Text>
    </Pressable>
  )}
</View>
```

### Gesture Handling
```typescript
// BEFORE (Svelte)
<div
  onpointerdown={handleDown}
  onpointermove={handleMove}
  onpointerup={handleUp}
/>

// AFTER (React Native)
const pan = Gesture.Pan()
  .onBegin(handleDown)
  .onUpdate(handleMove)
  .onEnd(handleUp);

<GestureDetector gesture={pan}>
  <View>{/* content */}</View>
</GestureDetector>
```

---

## Zustand Store Template

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useWordSearchStore = create(
  persist(
    (set) => ({
      // State
      category: null,
      difficulty: null,
      words: [],
      foundWords: new Set(),
      score: 0,
      grid: [],

      // Actions
      setGame: (category, difficulty, words, grid) =>
        set({
          category,
          difficulty,
          words,
          foundWords: new Set(),
          score: 0,
          grid
        }),

      markWordFound: (word) => set((state) => {
        if (state.foundWords.has(word)) return state;
        const foundWord = state.words.find(w => w.word === word);
        const points = foundWord?.points ?? 0;
        return {
          foundWords: new Set([...state.foundWords, word]),
          score: state.score + points
        };
      }),

      reset: () => set({
        category: null,
        difficulty: null,
        words: [],
        foundWords: new Set(),
        score: 0,
        grid: []
      })
    }),
    {
      name: 'wordSearchGameState',
      storage: createJSONStorage(() => AsyncStorage),
      // Set serialization
      serialize: (state) => JSON.stringify({
        ...state.state,
        foundWords: Array.from(state.state.foundWords)
      }),
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        return {
          state: {
            ...parsed.state,
            foundWords: new Set(parsed.state.foundWords)
          }
        };
      }
    }
  )
);
```

---

## Styling Setup

### `global.css`
```css
@import "tailwindcss";

@theme {
  --color-primary: #e63946;
  --color-secondary: #2a9d8f;
  --color-wordle-correct: #6aaa64;
  --color-wordle-present: #c9b458;
  --color-wordle-absent: #787c7e;
}

.cds-button--primary {
  background-color: var(--color-primary);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
}

.grid-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  font-weight: 600;
  border-radius: 3px;
}

.grid-cell.selected {
  background-color: #f59e0b !important;
  transform: scale(0.95);
}
```

### Import in `_layout.tsx`
```typescript
import '../global.css';
```

---

## Platform-Specific Code

### Confetti
```typescript
// Web: canvas-confetti
// Native: Lottie animation

import confetti from 'canvas-confetti';
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  confetti({ particleCount: 100 });
} else {
  // Lottie animation
}
```

### Keyboard Input
```typescript
useEffect(() => {
  if (Platform.OS !== 'web') return;

  const handleKeydown = (e: KeyboardEvent) => {
    // Handle keyboard
  };

  window.addEventListener('keydown', handleKeydown);
  return () => window.removeEventListener('keydown', handleKeydown);
}, []);
```

### Share
```typescript
import * as Clipboard from 'expo-clipboard';

if (Platform.OS === 'web' && navigator.clipboard) {
  await navigator.clipboard.writeText(text);
} else {
  await Clipboard.setStringAsync(text);
}
```

---

## File Structure

```
caccia-parole-expo/
├── app/
│   ├── _layout.tsx          # Root layout (TopNav + Toast)
│   ├── index.tsx            # Home/game selector
│   ├── caccia.tsx           # Word Search
│   └── parola.tsx           # Wordle
├── lib/
│   ├── components/
│   │   ├── WordSearchGame.tsx
│   │   ├── WordleGame.tsx
│   │   └── ui/
│   │       ├── TopNav.tsx
│   │       ├── Toast.tsx
│   │       ├── Modal.tsx
│   │       └── Confetti.tsx
│   ├── stores/
│   │   ├── word-search.ts
│   │   ├── wordle.ts
│   │   └── toast.tsx
│   ├── utils/
│   │   ├── gridGenerator.ts  (✅ copy verbatim)
│   │   └── wordDetection.ts  (✅ copy verbatim)
│   ├── data/
│   │   ├── word-data.ts      (✅ copy verbatim)
│   │   ├── wordle-data.ts    (✅ copy verbatim)
│   │   └── wordle-valid-words.ts (✅ copy verbatim)
│   └── types/
│       └── index.ts          (✅ copy verbatim)
├── assets/
│   ├── icon.png
│   ├── splash.png
│   └── confetti.json         (Lottie animation)
├── global.css
├── app.json
├── metro.config.js
├── tsconfig.json
└── package.json
```

---

## Testing Checklist

### Word Search
- [ ] Grid generation (10×10, 14×14, 18×18)
- [ ] 8-direction word placement
- [ ] Drag-to-select
- [ ] Word validation
- [ ] Score calculation
- [ ] Victory modal + confetti
- [ ] State persistence
- [ ] Dark mode

### Wordle
- [ ] Daily puzzle (deterministic)
- [ ] 6 guess limit
- [ ] Tile animations
- [ ] Keyboard state colors
- [ ] Share results
- [ ] Victory/loss modal
- [ ] State persistence
- [ ] Dark mode

### Cross-Platform
- [ ] Web (Chrome, Safari, Firefox)
- [ ] Mobile web (iOS, Android)
- [ ] Touch gestures work smoothly
- [ ] Keyboard input (web only)
- [ ] AsyncStorage persistence
- [ ] Responsive layouts

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Initial load | <2s |
| Grid render | <100ms |
| Gesture response | <16ms (60fps) |
| Animation frame rate | 60fps |
| Bundle size (web) | <500KB gzipped |

---

## Deployment

### Build
```bash
# Web
npx expo export --platform web
```

### Deploy
```bash
# Cloudflare Pages
wrangler pages deploy dist

# Vercel
vercel --prod

# Netlify
netlify deploy --prod --dir=dist
```

---

## Troubleshooting

### Metro bundler issues
```bash
npx expo start -c  # Clear cache
rm -rf node_modules .expo
npm install
```

### NativeWind not working
- Ensure `plugins: ["nativewind"]` in `app.json`
- Check `metro.config.js` has `withNativeWind`
- Restart dev server with `-c` flag

### Gesture Handler errors
```bash
# Ensure gesture handler is first in _layout.tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

<GestureHandlerRootView style={{ flex: 1 }}>
  {/* app content */}
</GestureHandlerRootView>
```

### AsyncStorage not persisting
- Check permissions in `app.json`
- Verify import: `@react-native-async-storage/async-storage`
- Test in dev tools: Application → Local Storage (web)

---

## Resources

- [Expo Docs](https://docs.expo.dev)
- [NativeWind v5](https://www.nativewind.dev/v5/overview)
- [Zustand](https://docs.pmnd.rs/zustand)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)

---

## Next Steps

1. ✅ Read `MIGRATION_PLAN.md` for detailed architecture
2. Create Expo project
3. Install dependencies
4. Copy pure logic files
5. Implement Zustand stores
6. Migrate components
7. Test feature parity
8. Deploy

**Estimated time: 3-4 weeks for solo developer**
