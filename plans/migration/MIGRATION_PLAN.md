# Svelte → React + Expo Web + NativeWind Migration Plan
**Caccia alle Parole (Word Hunt) - 100% Feature Parity**

---

## Project Overview
Converting Italian language learning game from:
- **FROM**: SvelteKit + Tailwind 4 + Cloudflare Workers
- **TO**: Expo Web + React + NativeWind + Tailwind 4

**Zero functionality loss. Zero UX degradation.**

---

## Phase 1: Project Initialization & Setup

### 1.1 Create New Expo Project
```bash
npx create-expo-app caccia-parole-expo --template blank-typescript
cd caccia-parole-expo
```

### 1.2 Install Core Dependencies
```bash
# Expo & React Native
npx expo install expo-router react-native-web react-dom
npx expo install expo-font expo-splash-screen expo-status-bar

# NativeWind v5 + Tailwind 4
npm install nativewind@next tailwindcss@4
npm install react-native-css

# Additional libraries
npm install canvas-confetti @types/canvas-confetti
npm install @react-native-async-storage/async-storage
npm install react-native-gesture-handler react-native-reanimated

# Icons (Expo Vector Icons - included with expo by default)
npx expo install @expo/vector-icons

# Utilities
npm install clsx tailwind-merge
```

### 1.3 Configure NativeWind v5 + Tailwind 4
**`app.json`**
```json
{
  "expo": {
    "plugins": ["nativewind"]
  }
}
```

**`global.css`** (Tailwind 4 syntax)
```css
@import "tailwindcss";

/* CDS tokens and components will be migrated here */
```

**`metro.config.js`**
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

### 1.4 Configure Expo Router (File-based Routing)
```
app/
├── _layout.tsx              # Root layout (TopNav + Toast)
├── index.tsx                # Home/game selector
├── caccia.tsx               # Word Search game
└── parola.tsx               # Wordle game
```

### 1.5 Configure ESLint + TypeScript

**Install dependencies:**
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D eslint-plugin-react eslint-plugin-react-native
npm install -D eslint-plugin-react-hooks prettier eslint-config-prettier
```

**`.eslintrc.js`:**
```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'react', 'react-native', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/prop-types': 'off', // Use TypeScript instead
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react-native/no-inline-styles': 'warn'
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
    'react-native/react-native': true
  }
};
```

**`.prettierrc.js`:**
```javascript
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'avoid'
};
```

**`package.json` scripts:**
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\""
  }
}
```

---

## Phase 2: Architecture Translation

### 2.1 State Management: Svelte Stores → React Custom Hooks

**Svelte Store Pattern:**
```typescript
// wordSearchStore (Svelte)
const { subscribe, set, update } = writable<State>(initial);
return { subscribe, setGame, markWordFound, reset };
```

**React Pattern (Zustand):**
```typescript
// Install: npm install zustand
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useWordSearchStore = create(
  persist(
    (set) => ({
      category: null,
      difficulty: null,
      words: [],
      foundWords: new Set(),
      score: 0,
      grid: [],

      setGame: (category, difficulty, words, grid) =>
        set({ category, difficulty, words, foundWords: new Set(), score: 0, grid }),

      markWordFound: (word) => set((state) => {
        if (state.foundWords.has(word)) return state;
        const foundWord = state.words.find(w => w.word === word);
        const points = foundWord?.points ?? 0;
        return {
          foundWords: new Set([...state.foundWords, word]),
          score: state.score + points
        };
      }),

      reset: () => set({ category: null, difficulty: null, words: [],
                        foundWords: new Set(), score: 0, grid: [] })
    }),
    {
      name: 'wordSearchGameState',
      storage: createJSONStorage(() => AsyncStorage),
      // Custom serialization for Set
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

**Alternative Pattern (React Context + useReducer):**
```typescript
// For lighter state without external deps
const WordSearchContext = createContext();

export function useWordSearchStore() {
  return useContext(WordSearchContext);
}

export function WordSearchProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // useEffect to sync with AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem('wordSearchGameState').then(/* hydrate */);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('wordSearchGameState', serialize(state));
  }, [state]);

  return (
    <WordSearchContext.Provider value={{ state, dispatch }}>
      {children}
    </WordSearchContext.Provider>
  );
}
```

**Decision: Use Zustand** - cleaner API, built-in persistence, smaller bundle

### 2.2 Component Translation Matrix

| Svelte Pattern | React + NativeWind Pattern |
|----------------|----------------------------|
| `$wordSearchStore.score` | `const { score } = useWordSearchStore()` |
| `$: computed = a + b` | `const computed = useMemo(() => a + b, [a, b])` |
| `let isSelecting = $state(false)` | `const [isSelecting, setIsSelecting] = useState(false)` |
| `{#if condition}` | `{condition && <View />}` |
| `{#each items as item}` | `{items.map(item => <Item key={item.id} />)}` |
| `<div class="cds-card">` | `<View className="cds-card">` |
| `onclick={handler}` | `<Pressable onPress={handler}>` |
| `onpointerdown={handler}` | `<Pressable onPressIn={handler}>` (Gesture Handler for drag) |
| Scoped `<style>` | StyleSheet or inline className |

### 2.3 Event Handling: Pointer Events → Gesture Handler

**Svelte (Pointer Events):**
```typescript
<div
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
>
```

**React Native (Gesture Handler):**
```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const panGesture = Gesture.Pan()
  .onBegin((e) => handlePointerDown(e))
  .onUpdate((e) => handlePointerMove(e))
  .onEnd((e) => handlePointerUp(e));

<GestureDetector gesture={panGesture}>
  <View>{/* grid */}</View>
</GestureDetector>
```

**Web fallback:** Use standard React events for web target

---

## Phase 3: File-by-File Migration

### 3.1 Core Game Logic (Pure TypeScript - Direct Copy)

**Files requiring ZERO changes:**
- ✅ `src/lib/data/word-data.ts` → `lib/data/word-data.ts`
- ✅ `src/lib/data/wordle-data.ts` → `lib/data/wordle-data.ts`
- ✅ `src/lib/data/wordle-valid-words.ts` → `lib/data/wordle-valid-words.ts`
- ✅ `src/lib/types/index.ts` → `lib/types/index.ts`
- ✅ `src/lib/utils/gridGenerator.ts` → `lib/utils/gridGenerator.ts`
- ✅ `src/lib/utils/wordDetection.ts` → `lib/utils/wordDetection.ts`

**Actions:**
1. Copy files verbatim
2. Verify TypeScript paths in `tsconfig.json`
3. Run type check: `npx tsc --noEmit`

### 3.2 State Management

#### `lib/stores/word-search.ts`
**Strategy:** Rewrite as Zustand store
- Maintain exact same API surface
- Use AsyncStorage instead of localStorage
- Set serialization for foundWords
- Keep all method signatures identical

#### `lib/stores/wordle.ts`
**Strategy:** Rewrite as Zustand store
- Preserve seeded RNG logic (critical for daily puzzle sync)
- Maintain evaluateGuess algorithm
- AsyncStorage persistence with date-based reset
- Keyboard state tracking unchanged

#### `lib/stores/toast.ts`
**Strategy:** Rewrite as React Context or simple hook
```typescript
// Simple React pattern
type Toast = { id: string; message: string; type: string; duration: number };

const ToastContext = createContext<{
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
}>(null!);

export function useToast() {
  return useContext(ToastContext);
}
```

### 3.3 Components

#### `components/ui/TopNav.tsx`
**Svelte → React:**
```typescript
// Before (Svelte)
<script lang="ts">
  let menuOpen = $state(false);
</script>

// After (React + NativeWind)
export function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View className="cds-nav">
      <Pressable onPress={() => setMenuOpen(!menuOpen)}>
        {/* Menu button */}
      </Pressable>
    </View>
  );
}
```

#### `components/WordSearchGame.tsx`
**Critical conversions:**
1. **Grid interaction:** Use Gesture Handler Pan gesture
2. **Cell selection:** Maintain Set-based tracking for performance
3. **Flash animations:** Use Reanimated or CSS animations
4. **Modal:** Use React state + Animated
5. **Confetti:** canvas-confetti works on web, custom for native

**Grid rendering optimization:**
```typescript
// Memoize cell components
const GridCell = memo(({ cell, isSelected, isFound, flashState }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return flashState === 'success'
      ? { backgroundColor: withSpring('#22c55e') }
      : {};
  });

  return (
    <Animated.View style={animatedStyle} className="grid-cell">
      <Text>{cell.letter}</Text>
    </Animated.View>
  );
});
```

#### `components/WordleGame.tsx`
**Critical conversions:**
1. **Keyboard input:**
   - Web: useEffect with window.addEventListener('keydown')
   - Native: On-screen keyboard only
2. **Tile flip animation:** Reanimated with stagger
3. **Keyboard state colors:** Computed from store
4. **Share results:**
   - Web: navigator.clipboard
   - Native: expo-sharing or expo-clipboard

**Keyboard layout:**
```typescript
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
];

function WordleKeyboard() {
  const { keyboardState } = useWordleStore();
  const handleKeyPress = useWordleStore(s => s.addLetter);

  return (
    <View className="flex flex-col gap-2">
      {KEYBOARD_ROWS.map((row, i) => (
        <View key={i} className="flex flex-row gap-1.5 justify-center">
          {row.map(key => (
            <Pressable
              key={key}
              onPress={() => handleKeyPress(key)}
              className={`wordle-key wordle-key-${keyboardState[key] || 'default'}`}
            >
              <Text className="wordle-key-text">{key}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
```

#### `components/ui/Confetti.tsx`
**Web:** Use canvas-confetti library directly
```typescript
import confetti from 'canvas-confetti';

export function Confetti({ trigger }: { trigger: boolean }) {
  useEffect(() => {
    if (trigger && Platform.OS === 'web') {
      confetti({ /* options */ });
    }
  }, [trigger]);

  return null; // Web-only, renders to canvas
}
```

**Native:** Use lottie-react-native or custom animation
```bash
npx expo install lottie-react-native
```

#### `components/ui/Modal.tsx`
**Strategy:** Use React Native Modal component
```typescript
import { Modal as RNModal } from 'react-native';

export function Modal({ visible, onClose, children }) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="cds-modal" onPress={onClose}>
        <View className="cds-modal__backdrop" />
        <Pressable onPress={e => e.stopPropagation()}>
          <View className="cds-modal__content">
            {children}
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
```

#### `components/ui/Toast.tsx`
**Strategy:** Animated notifications at top-right
```typescript
export function Toast() {
  const { toasts } = useToast();

  return (
    <View className="cds-toast-container" pointerEvents="box-none">
      {toasts.map(toast => (
        <Animated.View key={toast.id} entering={FadeInDown} exiting={FadeOutUp}>
          <View className={`cds-toast cds-toast--${toast.type}`}>
            <Text>{toast.message}</Text>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}
```

### 3.4 Pages/Routes

#### `app/index.tsx` (Home - Game Selector)
```typescript
import { Link } from 'expo-router';

export default function Home() {
  return (
    <View className="cds-container">
      <Text className="cds-heading-1">Caccia alle Parole</Text>

      <Link href="/caccia" asChild>
        <Pressable className="cds-card">
          <Text className="cds-heading-3">Caccia alle Parole</Text>
          <Text>Word Search Puzzle</Text>
        </Pressable>
      </Link>

      <Link href="/parola" asChild>
        <Pressable className="cds-card">
          <Text className="cds-heading-3">Paròla</Text>
          <Text>Daily Word Game</Text>
        </Pressable>
      </Link>
    </View>
  );
}
```

#### `app/caccia.tsx` (Word Search)
```typescript
import { WordSearchGame } from '@/components/WordSearchGame';

export default function CacciaPage() {
  return <WordSearchGame />;
}
```

#### `app/parola.tsx` (Wordle)
```typescript
import { WordleGame } from '@/components/WordleGame';

export default function ParolaPage() {
  return <WordleGame />;
}
```

#### `app/_layout.tsx` (Root Layout)
```typescript
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Head } from 'expo-router';
import { TopNav } from '@/components/ui/TopNav';
import { Toast } from '@/components/ui/Toast';
import { ToastProvider } from '@/lib/stores/toast';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function RootLayout() {
  // Initialize Plausible analytics (web only)
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Plausible script loaded via Head component below
      // Track page views automatically via expo-router navigation
    }
  }, []);

  return (
    <>
      <Head>
        <title>Caccia alle Parole - Italian Word Games</title>
        <meta name="description" content="Learn Italian with word search and Wordle games" />
        {Platform.OS === 'web' && (
          <>
            <script
              defer
              data-domain="cacciaparole.com"
              src="https://plausible.projects.sethwebster.com/js/script.hash.js"
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`
              }}
            />
          </>
        )}
      </Head>

      <GestureHandlerRootView style={{ flex: 1 }}>
        <ToastProvider>
          <TopNav />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="caccia" />
            <Stack.Screen name="parola" />
          </Stack>
          <Toast />
        </ToastProvider>
      </GestureHandlerRootView>
    </>
  );
}
```

**Plausible Custom Events (Optional):**
```typescript
// Track custom events in game components
import { Platform } from 'react-native';

const trackEvent = (eventName: string, props?: Record<string, any>) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.plausible?.(eventName, { props });
  }
};

// Usage examples:
trackEvent('game_started', { game: 'word_search', difficulty: 'hard' });
trackEvent('game_won', { game: 'wordle', guesses: 4 });
trackEvent('word_found', { category: 'animals', wordLength: 7 });
```

---

## Phase 4: Styling Migration

### 4.1 Tailwind 4 + NativeWind v5 Configuration

**`global.css`** (replaces `app.css`)
```css
@import "tailwindcss";

/* Custom Design System (CDS) Tokens */
@theme {
  /* Colors */
  --color-primary: #e63946;
  --color-secondary: #2a9d8f;
  --color-accent: #e9c46a;
  --color-dark: #264653;

  /* Wordle colors */
  --color-wordle-correct: #6aaa64;
  --color-wordle-present: #c9b458;
  --color-wordle-absent: #787c7e;
  --color-wordle-empty: #d3d6da;

  /* Spacing - CDS tokens */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-card: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-focus: 0 0 0 3px rgb(230 57 70 / 0.5);
}

/* Typography */
.cds-heading-1 { font-size: 2.5rem; font-weight: 700; line-height: 1.2; }
.cds-heading-2 { font-size: 2rem; font-weight: 700; line-height: 1.3; }
.cds-heading-3 { font-size: 1.5rem; font-weight: 600; line-height: 1.4; }
.cds-heading-4 { font-size: 1.25rem; font-weight: 600; line-height: 1.4; }

/* Buttons */
.cds-button {
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: all 0.2s;
}

.cds-button--primary {
  background-color: var(--color-primary);
  color: white;
}

.cds-button--outline {
  background-color: transparent;
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
}

/* Cards */
.cds-card {
  background-color: white;
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
}

/* Grid cells */
.grid-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  aspect-ratio: 1;
  border-radius: 3px;
  background-color: #f8f9fa;
}

.grid-cell.selected {
  background-color: #f59e0b !important;
  color: #1a1a1b !important;
  transform: scale(0.95);
}

.grid-cell.found {
  background-color: var(--color-secondary);
  color: white;
}

/* Wordle tiles */
.wordle-tile {
  width: 62px;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  border: 2px solid var(--color-wordle-empty);
  background-color: white;
  text-transform: uppercase;
}

.wordle-tile-correct {
  background-color: var(--color-wordle-correct);
  border-color: var(--color-wordle-correct);
  color: white;
}

.wordle-tile-present {
  background-color: var(--color-wordle-present);
  border-color: var(--color-wordle-present);
  color: white;
}

.wordle-tile-absent {
  background-color: var(--color-wordle-absent);
  border-color: var(--color-wordle-absent);
  color: white;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #1a1a1b;
    --color-surface: #272729;
    --color-text-primary: #d7dadc;
    --color-text-secondary: #818384;
  }

  .cds-card {
    background-color: var(--color-surface);
  }

  .grid-cell {
    background-color: var(--color-surface);
    color: var(--color-text-primary);
  }
}

/* Animations */
@keyframes pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

@keyframes flip {
  0% { transform: rotateX(0); }
  50% { transform: rotateX(90deg); }
  100% { transform: rotateX(0); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-3px); }
  40%, 80% { transform: translateX(3px); }
}
```

### 4.2 NativeWind Class Mapping

**All Tailwind utility classes work as-is in NativeWind v5:**
```typescript
// ✅ Direct translation
<View className="flex flex-col gap-4 p-4" />
<Text className="text-2xl font-bold text-center" />
<Pressable className="bg-primary rounded-lg px-6 py-3" />
```

**Custom classes from global.css:**
```typescript
<View className="cds-card" />
<Text className="cds-heading-1" />
<Pressable className="cds-button cds-button--primary" />
```

### 4.3 Font Loading Best Practices

**Strategy: System fonts with web font fallback**

**`app/_layout.tsx`:**
```typescript
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// Prevent auto-hiding splash screen
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Only load custom fonts if needed for branding
    // Default to system fonts for performance
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    // ... rest of layout
  );
}
```

**`global.css` - System font stack:**
```css
@theme {
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
               Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono',
               Consolas, 'Courier New', monospace;
}

body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.font-mono {
  font-family: var(--font-mono);
}
```

**Benefits:**
- ✅ No flash of unstyled text (FOUT)
- ✅ Faster initial load
- ✅ Native look and feel per platform
- ✅ Smaller bundle size

**Optional: Custom web fonts (if brand requirements exist)**
```typescript
// Only if absolutely necessary
const [fontsLoaded] = useFonts({
  'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
  'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
});
```

### 4.4 Component-Specific Styles

**Option A: Inline className (preferred)**
```typescript
<View className="grid-cell selected found" />
```

**Option B: StyleSheet for complex animations**
```typescript
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  gridCell: {
    aspectRatio: 1,
    borderRadius: 3,
    // ...
  }
});

<View style={[styles.gridCell, isSelected && styles.selected]} />
```

**Option C: Reanimated for animations**
```typescript
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: withSpring(isSelected ? 0.95 : 1) }]
}));

<Animated.View style={animatedStyle} className="grid-cell" />
```

---

## Phase 5: Platform-Specific Adaptations

### 5.1 Storage Layer

**Before (Svelte - localStorage):**
```typescript
localStorage.setItem('key', JSON.stringify(value));
const value = JSON.parse(localStorage.getItem('key'));
```

**After (React Native - AsyncStorage):**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('key', JSON.stringify(value));
const value = JSON.parse(await AsyncStorage.getItem('key') ?? '{}');
```

**Handled by Zustand persist middleware - no manual calls needed**

### 5.2 Input Handling

**Word Search Grid:**
- **Web:** Mouse events (onPointerDown, onPointerMove, onPointerUp)
- **Native:** Gesture Handler Pan gesture
- **Solution:** Conditional Platform.select or unified gesture API

```typescript
import { Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const GridWithGestures = Platform.select({
  web: () => (
    <div
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
    >
      {/* grid */}
    </div>
  ),
  default: () => {
    const pan = Gesture.Pan()
      .onBegin(handleDown)
      .onUpdate(handleMove)
      .onEnd(handleUp);

    return (
      <GestureDetector gesture={pan}>
        <View>{/* grid */}</View>
      </GestureDetector>
    );
  }
})();
```

**Wordle Keyboard:**
- **Web:** Physical keyboard + on-screen
- **Native:** On-screen only
- **Solution:** Conditional keyboard listener

```typescript
useEffect(() => {
  if (Platform.OS !== 'web') return;

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') submitGuess();
    else if (e.key === 'Backspace') deleteLetter();
    else if (/^[a-zA-Z]$/.test(e.key)) addLetter(e.key.toUpperCase());
  };

  window.addEventListener('keydown', handleKeydown);
  return () => window.removeEventListener('keydown', handleKeydown);
}, []);
```

### 5.3 Confetti

**Web:** canvas-confetti (works on web target)
```typescript
import confetti from 'canvas-confetti';

export function Confetti({ trigger }: { trigger: boolean }) {
  useEffect(() => {
    if (!trigger || Platform.OS !== 'web') return;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, [trigger]);

  return null;
}
```

**Native:** Lottie animation or custom SVG animation
```typescript
import LottieView from 'lottie-react-native';

export function Confetti({ trigger }: { trigger: boolean }) {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (trigger && Platform.OS !== 'web') {
      animationRef.current?.play();
    }
  }, [trigger]);

  if (Platform.OS === 'web') return null;

  return (
    <LottieView
      ref={animationRef}
      source={require('@/assets/confetti.json')}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      loop={false}
      autoPlay={false}
    />
  );
}
```

### 5.4 Share Functionality

**Web:** navigator.clipboard
```typescript
if (Platform.OS === 'web' && navigator.clipboard) {
  await navigator.clipboard.writeText(shareText);
}
```

**Native:** expo-clipboard
```typescript
import * as Clipboard from 'expo-clipboard';

await Clipboard.setStringAsync(shareText);
```

---

## Phase 6: Build & Deployment

### 6.1 Web Build (Cloudflare Workers Deployment)

**Build command:**
```bash
npx expo export --platform web
```

**Output:** `dist/` directory with static HTML/JS/CSS

**Cloudflare Workers Configuration:**

Create `wrangler.toml`:
```toml
name = "caccia-parole"
compatibility_date = "2026-01-26"
compatibility_flags = ["nodejs_compat"]

[site]
bucket = "./dist"

[[routes]]
pattern = "cacciaparole.com/*"
zone_name = "cacciaparole.com"

[[routes]]
pattern = "www.cacciaparole.com/*"
zone_name = "cacciaparole.com"
```

Create `_worker.js` (if custom headers/redirects needed):
```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Redirect www to non-www
    if (url.hostname === 'www.cacciaparole.com') {
      return Response.redirect(`https://cacciaparole.com${url.pathname}`, 301);
    }

    // Serve static assets
    return env.ASSETS.fetch(request);
  }
};
```

**Deploy:**
```bash
npm run build
wrangler deploy
```

**Custom domain setup (cacciaparole.com):**
- Domain already configured in existing Cloudflare account
- Routes automatically apply to domain
- HTTPS enabled by default

### 6.2 Native Build (Optional - Future Enhancement)

**Android:**
```bash
eas build --platform android
```

**iOS:**
```bash
eas build --platform ios
```

### 6.3 Build Configuration

**`app.json`:**
```json
{
  "expo": {
    "name": "Caccia alle Parole",
    "slug": "caccia-parole",
    "version": "2.0.1",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#264653"
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "nativewind",
      "expo-router",
      "expo-font"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

---

## Phase 7: Testing & Validation

### 7.1 Feature Parity Checklist

#### Word Search Game (Caccia)
- [ ] Category selection (24 categories)
- [ ] Difficulty selection (easy/medium/hard)
- [ ] Grid generation with correct sizes (10x10, 14x14, 18x18)
- [ ] 8-directional word placement
- [ ] Drag-to-select word detection
- [ ] Touch support for mobile
- [ ] Word highlighting on selection
- [ ] Flash feedback (green success, red error)
- [ ] Found words tracking
- [ ] Score calculation (length × 10 × multiplier)
- [ ] Word list display with translations
- [ ] Victory modal with confetti
- [ ] Persistent game state
- [ ] New game / reset functionality
- [ ] Italian accent normalization (è→e, etc.)
- [ ] Dark mode support

#### Wordle Game (Paròla)
- [ ] Daily puzzle with deterministic word selection
- [ ] 6 guess limit
- [ ] 5-letter word validation
- [ ] Keyboard input (physical + on-screen)
- [ ] Tile color feedback (green/yellow/gray)
- [ ] Flip animations on guess submit
- [ ] Keyboard color state tracking
- [ ] Share results with emoji grid
- [ ] Victory/loss modal
- [ ] Confetti on win
- [ ] Persistent game state per day
- [ ] Automatic daily reset
- [ ] Word definition display on game end
- [ ] ~10,000 word database
- [ ] Dark mode support

#### UI Components
- [ ] TopNav with responsive menu
- [ ] Toast notifications (success/error/warning/info)
- [ ] Modal dialogs with backdrop
- [ ] Button variants (primary/outline/disabled)
- [ ] Card components
- [ ] Responsive grid layouts
- [ ] Mobile-first responsive design
- [ ] Accessibility (ARIA labels, keyboard nav)

#### Performance
- [ ] Grid rendering <100ms on 18x18 grid
- [ ] Set-based lookups for found words
- [ ] Memoized cell components
- [ ] No unnecessary re-renders
- [ ] Smooth animations (60fps)
- [ ] Fast AsyncStorage reads (<50ms)

### 7.2 Cross-Platform Testing

**Web:**
- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Mobile browsers (iOS Safari, Chrome Android)

**Native (if building):**
- iOS Simulator
- Android Emulator
- Physical devices

**Viewport sizes:**
- Mobile: 375×667 (iPhone SE)
- Tablet: 768×1024 (iPad)
- Desktop: 1920×1080

### 7.3 Testing Setup (Vitest + React Testing Library)

**Install dependencies:**
```bash
npm install -D vitest @testing-library/react-native @testing-library/jest-native
npm install -D @vitest/ui happy-dom
```

**`vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.d.ts', '**/node_modules/**', '**/dist/**']
    }
  },
  resolve: {
    alias: {
      '@': '/lib'
    }
  }
});
```

**`test/setup.ts`:**
```typescript
import '@testing-library/jest-native/extend-expect';
import { cleanup } from '@testing-library/react-native';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock AsyncStorage
global.AsyncStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
  clear: async () => {}
};
```

**Example test: `lib/utils/gridGenerator.test.ts`:**
```typescript
import { describe, it, expect } from 'vitest';
import { generateGrid } from './gridGenerator';

describe('gridGenerator', () => {
  it('generates 10x10 grid for easy difficulty', () => {
    const result = generateGrid({ category: 'animals', difficulty: 'easy' });
    expect(result.grid).toHaveLength(10);
    expect(result.grid[0]).toHaveLength(10);
  });

  it('places all words in grid', () => {
    const result = generateGrid({ category: 'colors', difficulty: 'easy' });
    expect(result.words).toHaveLength(10);
    result.words.forEach(word => {
      expect(word.row).toBeGreaterThanOrEqual(0);
      expect(word.col).toBeGreaterThanOrEqual(0);
    });
  });
});
```

**Example component test: `components/WordleGame.test.tsx`:**
```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { describe, it, expect, beforeEach } from 'vitest';
import { WordleGame } from './WordleGame';

describe('WordleGame', () => {
  beforeEach(() => {
    // Reset store state
  });

  it('renders 6 guess rows', () => {
    const { getAllByTestId } = render(<WordleGame />);
    const rows = getAllByTestId('wordle-row');
    expect(rows).toHaveLength(6);
  });

  it('accepts letter input via keyboard', () => {
    const { getByText } = render(<WordleGame />);
    const qKey = getByText('Q');
    fireEvent.press(qKey);
    // Assert state updated
  });
});
```

**Run tests:**
```bash
npm test              # Run all tests
npm run test:ui       # Open Vitest UI
npm run test:coverage # Generate coverage report
```

**`package.json` scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### 7.4 User Experience Validation

**Word Search:**
1. Start new game → verify grid generation
2. Select word horizontally → verify found state
3. Select word vertically → verify found state
4. Select word diagonally → verify found state
5. Select invalid word → verify error flash
6. Select already found word → verify no duplicate points
7. Find all words → verify victory modal + confetti
8. Reset game → verify state cleared
9. Refresh page → verify state persistence
10. Change difficulty → verify grid size changes

**Wordle:**
1. Enter invalid word → verify rejection (no submission)
2. Enter valid word → verify tile flip + color feedback
3. Enter word with repeated letters → verify correct yellow/green logic
4. Win in 3 guesses → verify confetti + victory modal
5. Lose after 6 guesses → verify loss modal with answer
6. Share results → verify clipboard copy
7. Physical keyboard input → verify letter entry
8. On-screen keyboard input → verify letter entry
9. Refresh page mid-game → verify state restoration
10. Next day → verify new puzzle + state reset

### 7.4 Edge Cases

- [ ] Empty grid cells don't crash
- [ ] Rapid clicking doesn't create duplicate found words
- [ ] Drag outside grid boundary doesn't crash
- [ ] AsyncStorage full error handled gracefully
- [ ] Network disconnection doesn't break game
- [ ] Multiple rapid taps on keyboard don't create invalid state
- [ ] Orientation change on mobile preserves state
- [ ] App background/foreground doesn't lose state

---

## Phase 8: Git Strategy (Gitflow)

### Branch Structure
```
main              # Production-ready code
├── develop       # Integration branch
    ├── feature/expo-setup
    ├── feature/state-management
    ├── feature/word-search-game
    ├── feature/wordle-game
    ├── feature/ui-components
    └── feature/styling-animations
```

### Workflow
```bash
# 1. Create develop branch from main
git checkout -b develop

# 2. Create feature branches from develop
git checkout -b feature/expo-setup develop

# 3. Work on feature, commit frequently
git add .
git commit -m "feat: configure Expo Router"

# 4. Merge feature into develop
git checkout develop
git merge --no-ff feature/expo-setup

# 5. When ready for production
git checkout main
git merge --no-ff develop
git tag -a v2.0.0 -m "Expo migration complete"
git push origin main --tags
```

### Commit Message Convention
```
feat: add Wordle keyboard component
fix: correct grid cell selection on touch
refactor: extract grid generation to util
test: add Wordle game unit tests
docs: update migration progress
style: format with Prettier
perf: optimize grid rendering with memo
chore: configure ESLint
```

### Feature Branches
1. `feature/expo-setup` - Initial project setup, dependencies, config
2. `feature/data-migration` - Copy pure logic files, types, utils
3. `feature/state-management` - Zustand stores, toast context
4. `feature/word-search-game` - WordSearchGame component
5. `feature/wordle-game` - WordleGame component
6. `feature/ui-components` - TopNav, Modal, Button, Card, etc.
7. `feature/styling-animations` - NativeWind config, animations
8. `feature/testing` - Vitest setup, test suites
9. `feature/deployment` - Cloudflare Workers config, CI/CD

## Phase 9: Migration Execution Order

### Week 1: Foundation
**Day 1-2: Project Setup**
- Create Expo project
- Install dependencies
- Configure NativeWind + Tailwind 4
- Configure Expo Router
- Set up TypeScript paths

**Day 3-4: Data & Types**
- Copy all `lib/data/` files
- Copy all `lib/types/` files
- Copy all `lib/utils/` files
- Verify TypeScript compilation

**Day 5-7: State Management**
- Implement Zustand store for Word Search
- Implement Zustand store for Wordle
- Implement Toast context
- Test persistence with AsyncStorage

### Week 2: Core Components
**Day 1-3: Word Search Game**
- Implement grid rendering
- Implement gesture handling
- Implement word detection
- Implement scoring logic
- Implement victory modal

**Day 4-6: Wordle Game**
- Implement tile grid
- Implement keyboard component
- Implement guess evaluation
- Implement animations
- Implement share functionality

**Day 7: UI Components**
- TopNav
- Toast
- Modal
- Button/Card components

### Week 3: Styling & Polish
**Day 1-3: Design System**
- Port all CDS tokens to global.css
- Implement component styles
- Test dark mode
- Responsive breakpoints

**Day 4-5: Animations**
- Tile flip animations
- Flash feedback animations
- Confetti implementation
- Modal enter/exit animations

**Day 6-7: Cross-Platform**
- Platform-specific gesture handling
- Platform-specific keyboard input
- Platform-specific confetti
- Platform-specific storage

### Week 4: Testing & Deployment
**Day 1-3: Testing**
- Feature parity validation
- Cross-browser testing
- Mobile device testing
- Performance profiling

**Day 4-5: Bug Fixes**
- Fix identified issues
- Optimize performance
- Accessibility improvements

**Day 6-7: Deployment**
- Build web bundle
- Deploy to hosting
- Configure custom domain
- Monitor production

---

## Phase 9: Critical Success Factors

### 9.1 Must-Have Features (Zero Compromise)

1. **Exact Grid Generation Algorithm**
   - Same word placement logic
   - Same direction weights
   - Same decoy word generation
   - Same accent normalization

2. **Deterministic Wordle Puzzle**
   - Same seeded RNG (seed=42)
   - Same shuffle algorithm
   - Same daily word calculation
   - All users get identical puzzle

3. **Gesture Handling Fidelity**
   - Drag-to-select feels identical
   - Touch response <16ms
   - No accidental selections
   - Smooth highlighting

4. **State Persistence**
   - Game state survives refresh
   - Found words persist
   - Score persists
   - Wordle daily puzzle persists

5. **Visual Parity**
   - Colors match exactly
   - Fonts match exactly
   - Spacing matches exactly
   - Animations feel identical

### 9.2 Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Initial load (web) | <2s | Yes |
| Grid render (18×18) | <100ms | Yes |
| Gesture response | <16ms (60fps) | Yes |
| AsyncStorage read | <50ms | Yes |
| Animation frame rate | 60fps | Yes |
| Bundle size (web) | <500KB gzipped | No |

### 9.3 Risk Mitigation

**Risk 1: Gesture handling feels different**
- **Mitigation:** Extensive touch testing on real devices
- **Fallback:** Adjust touch target sizes, debounce timing

**Risk 2: Animations stutter on low-end devices**
- **Mitigation:** Use native driver for Reanimated
- **Fallback:** Reduce animation complexity, disable on low perf

**Risk 3: AsyncStorage too slow**
- **Mitigation:** Batch writes, debounce saves
- **Fallback:** In-memory cache with periodic flush

**Risk 4: Bundle size too large**
- **Mitigation:** Tree shaking, code splitting
- **Fallback:** Lazy load non-critical components

**Risk 5: Confetti not working on all platforms**
- **Mitigation:** Platform-specific implementations
- **Fallback:** Simple SVG animation

---

## Phase 10: Post-Migration Enhancements (Optional)

### Future Improvements (Not in Initial Scope)

1. **Native Mobile Apps**
   - Build iOS/Android apps
   - Publish to App Store / Play Store
   - Push notifications for daily puzzle

2. **Multiplayer Mode**
   - Compete with friends
   - Leaderboards
   - Real-time challenges

3. **More Game Modes**
   - Timed challenges
   - Endless mode
   - Category-specific challenges

4. **User Accounts**
   - Save progress across devices
   - Statistics tracking
   - Achievement system

5. **Internationalization**
   - More languages beyond Italian
   - UI translation system
   - Regional leaderboards

6. **Offline Support**
   - Service worker for PWA
   - Offline game play
   - Background sync

---

## Appendix A: Dependency Comparison

### Before (Svelte)
```json
{
  "@sveltejs/kit": "^2.50.0",
  "@sveltejs/adapter-cloudflare": "^7.2.5",
  "svelte": "^5.47.1",
  "tailwindcss": "^4.1.18",
  "@tailwindcss/vite": "^4.1.18",
  "canvas-confetti": "^1.9.4",
  "vite": "^7.3.1",
  "wrangler": "^4.59.3"
}
```

### After (Expo)
```json
{
  "expo": "~52.0.0",
  "expo-router": "~4.0.0",
  "react": "18.3.1",
  "react-native": "0.76.1",
  "react-native-web": "~0.19.13",
  "nativewind": "^5.0.0",
  "tailwindcss": "^4.1.18",
  "react-native-css": "^2.0.0",
  "zustand": "^5.0.0",
  "@react-native-async-storage/async-storage": "^2.1.0",
  "react-native-gesture-handler": "~2.20.0",
  "react-native-reanimated": "~3.16.0",
  "canvas-confetti": "^1.9.4",
  "lottie-react-native": "^7.0.0",
  "expo-clipboard": "~7.0.0"
}
```

**Size comparison:**
- Svelte bundle: ~180KB gzipped (estimated)
- Expo web bundle: ~450KB gzipped (estimated)
- Trade-off: Slightly larger bundle for native app capability

---

## Appendix B: File Structure Comparison

### Before (SvelteKit)
```
src/
├── routes/
│   ├── +page.svelte
│   ├── +layout.svelte
│   ├── caccia/+page.svelte
│   └── parola/+page.svelte
├── lib/
│   ├── components/
│   ├── stores/
│   ├── utils/
│   ├── data/
│   └── types/
└── app.css
```

### After (Expo)
```
app/
├── index.tsx
├── _layout.tsx
├── caccia.tsx
└── parola.tsx
lib/
├── components/
├── stores/
├── utils/
├── data/
└── types/
global.css
```

**Key differences:**
- `routes/` → `app/` (Expo Router convention)
- `+page.svelte` → `.tsx` (React components)
- `$lib/` → `lib/` or `@/` (path alias)
- `app.css` → `global.css` (NativeWind convention)

---

## Appendix C: Command Cheatsheet

### Development
```bash
# Start dev server
npm start
npx expo start

# Start web only
npm run web
npx expo start --web

# Clear cache
npm run clear
npx expo start -c
```

### Building
```bash
# Build web
npx expo export --platform web

# Build native (requires EAS)
eas build --platform android
eas build --platform ios
```

### Testing
```bash
# Type check
npx tsc --noEmit

# Run tests (if configured)
npm test
```

### Deployment
```bash
# Deploy web to Vercel
vercel --prod

# Deploy web to Netlify
netlify deploy --prod --dir=dist

# Deploy web to Cloudflare Pages
wrangler pages deploy dist
```

---

## Summary

**Total Migration Time:** 3-4 weeks (1 developer)

**Risk Level:** Low - proven migration path, all features have React equivalents

**Breaking Changes:** None - exact feature parity

**Performance Impact:** Negligible - similar or better performance

**Bundle Size Impact:** +150KB gzipped (acceptable for cross-platform capability)

**Maintenance Benefit:** Access to entire React Native ecosystem, ability to build native apps

**Future-Proof:** Expo is actively maintained, large community, clear upgrade paths

---

## Configuration Decisions ✅

1. **Hosting:** Cloudflare Workers (Pages retired, use Workers with static assets)
2. **Native apps:** Web-first, incremental mobile migration later
3. **Analytics:** Plausible at https://plausible.projects.sethwebster.com
   ```html
   <script defer data-domain="cacciaparole.com"
           src="https://plausible.projects.sethwebster.com/js/script.hash.js"></script>
   <script>window.plausible = window.plausible || function() {
     (window.plausible.q = window.plausible.q || []).push(arguments)
   }</script>
   ```
4. **Error tracking:** None for now
5. **Font loading:** Best practices (system fonts with web font fallback)
6. **Icon pack:** Recommended standard (Expo Vector Icons)
7. **Testing framework:** Vitest + React Testing Library
8. **Linting:** ESLint standards
9. **Git strategy:** Gitflow (feature branches, develop, main)
10. **Data migration:** Fresh start (no real data exists yet)
