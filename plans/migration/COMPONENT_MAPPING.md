# Svelte → React Component Mapping Guide
**Complete translation reference for every component**

---

## Table of Contents

1. [WordSearchGame Component](#1-wordsearchgame-component)
2. [WordleGame Component](#2-wordlegame-component)
3. [TopNav Component](#3-topnav-component)
4. [Toast Component](#4-toast-component)
5. [Modal Component](#5-modal-component)
6. [Confetti Component](#6-confetti-component)
7. [Button Component](#7-button-component)
8. [Card Component](#8-card-component)

---

## 1. WordSearchGame Component

### Svelte Implementation (657 lines)
**Key features:**
- Pointer event handling for drag-to-select
- Grid cell state management (selected, found, flash)
- Pre-computed Sets for performance
- Flash animations on success/error
- Victory modal with confetti

### React Translation Strategy

#### State Management
```typescript
// Svelte
let isSelecting = false;
let startCell: SelectedCell | null = null;
let currentCell: SelectedCell | null = null;
let selectedCells: SelectedCell[] = [];

// React
const [isSelecting, setIsSelecting] = useState(false);
const [startCell, setStartCell] = useState<SelectedCell | null>(null);
const [currentCell, setCurrentCell] = useState<SelectedCell | null>(null);
const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
```

#### Reactive Computations
```typescript
// Svelte
$: isGameActive = $wordSearchStore.category && $wordSearchStore.difficulty;
$: foundCount = $wordSearchStore.foundWords.size;
$: isGameWon = isGameActive && foundCount === totalWords;

// React
const { category, difficulty, foundWords, words } = useWordSearchStore();
const isGameActive = category && difficulty;
const foundCount = foundWords.size;
const totalWords = words.length;
const isGameWon = useMemo(
  () => isGameActive && foundCount === totalWords && totalWords > 0,
  [isGameActive, foundCount, totalWords]
);
```

#### Gesture Handling (Web)
```typescript
// React - Web version with mouse events
const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
  if (!isGameActive) return;

  const cell = getCellFromPointer(e);
  if (!cell) return;

  e.preventDefault();
  e.currentTarget.setPointerCapture(e.pointerId);

  setIsSelecting(true);
  const startCellData = {
    row: cell.row,
    col: cell.col,
    letter: grid[cell.row][cell.col].letter
  };
  setStartCell(startCellData);
  setCurrentCell(startCellData);
  setSelectedCells([startCellData]);
};

const handleGridPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
  if (!isSelecting || !startCell || !isGameActive) return;

  const cell = getCellFromPointer(e);
  if (!cell) return;

  if (!currentCell || currentCell.row !== cell.row || currentCell.col !== cell.col) {
    const newCurrentCell = {
      row: cell.row,
      col: cell.col,
      letter: grid[cell.row][cell.col].letter
    };
    setCurrentCell(newCurrentCell);
    setSelectedCells(
      getCellsBetween(
        startCell.row,
        startCell.col,
        newCurrentCell.row,
        newCurrentCell.col,
        grid
      )
    );
  }
};

const handleGridPointerUp = () => {
  if (!isSelecting || selectedCells.length === 0) {
    setIsSelecting(false);
    setStartCell(null);
    setCurrentCell(null);
    setSelectedCells([]);
    return;
  }

  const word = getWordFromCells(selectedCells);
  const foundWord = checkIfWordFound(word, words);

  setFlashCells([...selectedCells]);

  if (foundWord && !foundWords.has(foundWord.word)) {
    markWordFound(foundWord.word);
    setFlashState('success');
  } else if (selectedCells.length > 1) {
    setFlashState('error');
  }

  setIsSelecting(false);
  setStartCell(null);
  setCurrentCell(null);
  setSelectedCells([]);

  if (flashState !== 'none') {
    setTimeout(() => {
      setFlashState('none');
      setFlashCells([]);
    }, 400);
  }
};
```

#### Gesture Handling (Native)
```typescript
// React Native - Gesture Handler version
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const panGesture = useMemo(() => {
  return Gesture.Pan()
    .onBegin((e) => {
      if (!isGameActive) return;

      const cell = getCellFromGesture(e);
      if (!cell) return;

      setIsSelecting(true);
      const startCellData = {
        row: cell.row,
        col: cell.col,
        letter: grid[cell.row][cell.col].letter
      };
      setStartCell(startCellData);
      setCurrentCell(startCellData);
      setSelectedCells([startCellData]);
    })
    .onUpdate((e) => {
      if (!isSelecting || !startCell || !isGameActive) return;

      const cell = getCellFromGesture(e);
      if (!cell) return;

      if (!currentCell || currentCell.row !== cell.row || currentCell.col !== cell.col) {
        const newCurrentCell = {
          row: cell.row,
          col: cell.col,
          letter: grid[cell.row][cell.col].letter
        };
        setCurrentCell(newCurrentCell);
        setSelectedCells(
          getCellsBetween(
            startCell.row,
            startCell.col,
            newCurrentCell.row,
            newCurrentCell.col,
            grid
          )
        );
      }
    })
    .onEnd(() => {
      // Same logic as handleGridPointerUp
    });
}, [isGameActive, isSelecting, startCell, currentCell, grid, words, foundWords]);

// Render
<GestureDetector gesture={panGesture}>
  <View className="word-grid" style={gridStyle}>
    {/* cells */}
  </View>
</GestureDetector>
```

#### Performance Optimizations
```typescript
// Pre-compute Sets for fast lookups (same as Svelte)
const selectedCellSet = useMemo(
  () => new Set(selectedCells.map(c => `${c.row},${c.col}`)),
  [selectedCells]
);

const flashCellSet = useMemo(
  () => new Set(flashCells.map(c => `${c.row},${c.col}`)),
  [flashCells]
);

const foundCellSet = useMemo(() => {
  return new Set(
    Array.from(foundWords).flatMap(foundWord => {
      const placedWord = words.find(w => w.word === foundWord);
      if (!placedWord) return [];

      const [deltaRow, deltaCol] = getDirectionDelta(placedWord.direction);
      return Array.from({ length: placedWord.word.length }, (_, i) =>
        `${placedWord.row + i * deltaRow},${placedWord.col + i * deltaCol}`
      );
    })
  );
}, [foundWords, words]);

// Memoized grid cell component
const GridCell = memo(({
  cell,
  rowIndex,
  colIndex,
  isSelected,
  isFound,
  flashState
}: GridCellProps) => {
  const cellKey = `${rowIndex},${colIndex}`;
  const selected = isSelected.has(cellKey);
  const found = isFound.has(cellKey);
  const flashSuccess = flashState === 'success' && flashCells.has(cellKey);
  const flashError = flashState === 'error' && flashCells.has(cellKey);

  return (
    <View
      className={cn(
        'grid-cell',
        selected && 'selected',
        found && 'found',
        flashSuccess && 'flash-success',
        flashError && 'flash-error'
      )}
    >
      <Text className="grid-cell-letter">{cell.letter}</Text>
    </View>
  );
});
```

#### Victory Detection
```typescript
// React - useEffect for victory modal
useEffect(() => {
  if (isGameWon && !showModal) {
    setTriggerConfetti(true);
    const timeout = setTimeout(() => {
      setShowModal(true);
    }, 500);
    return () => clearTimeout(timeout);
  }
}, [isGameWon, showModal]);
```

---

## 2. WordleGame Component

### Svelte Implementation (264 lines)
**Key features:**
- Keyboard input (physical + on-screen)
- Tile flip animations with stagger
- Keyboard state color tracking
- Share results to clipboard
- Victory/loss modal

### React Translation Strategy

#### Keyboard Input
```typescript
// React - Physical keyboard (web only)
useEffect(() => {
  if (Platform.OS !== 'web') return;

  const handleKeydown = (e: KeyboardEvent) => {
    if (gameState !== 'playing') return;

    if (e.key === 'Enter') {
      submitGuess();
    } else if (e.key === 'Backspace') {
      deleteLetter();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      addLetter(e.key.toUpperCase());
    }
  };

  window.addEventListener('keydown', handleKeydown);
  return () => window.removeEventListener('keydown', handleKeydown);
}, [gameState, submitGuess, deleteLetter, addLetter]);
```

#### On-Screen Keyboard
```typescript
// React - On-screen keyboard component
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
];

function WordleKeyboard() {
  const { keyboardState } = useWordleStore();
  const addLetter = useWordleStore(s => s.addLetter);
  const deleteLetter = useWordleStore(s => s.deleteLetter);
  const submitGuess = useWordleStore(s => s.submitGuess);

  const handleKeyClick = useCallback((key: string) => {
    if (key === 'ENTER') {
      submitGuess();
    } else if (key === '⌫') {
      deleteLetter();
    } else {
      addLetter(key);
    }
  }, [addLetter, deleteLetter, submitGuess]);

  return (
    <View className="flex flex-col gap-2">
      {KEYBOARD_ROWS.map((row, i) => (
        <View key={i} className="flex flex-row gap-1.5 justify-center">
          {row.map(key => (
            <Pressable
              key={key}
              onPress={() => handleKeyClick(key)}
              className={cn(
                'wordle-key',
                key.length > 1 && 'wordle-key-wide',
                `wordle-key-${keyboardState[key] || 'default'}`
              )}
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

#### Tile Animations
```typescript
// React - Animated tile component
import Animated, {
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSequence
} from 'react-native-reanimated';

const WordleTile = memo(({
  letter,
  status,
  position,
  isLatestGuess
}: WordleTileProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    if (!isLatestGuess) return {};

    // Flip animation with stagger
    return {
      transform: [
        {
          rotateX: withDelay(
            position * 100, // Stagger by position
            withSequence(
              withTiming('90deg', { duration: 250 }),
              withTiming('0deg', { duration: 250 })
            )
          )
        }
      ]
    };
  });

  return (
    <Animated.View
      style={animatedStyle}
      className={cn(
        'wordle-tile',
        status && 'wordle-tile-evaluated',
        status && `wordle-tile-${status}`
      )}
    >
      <Text className="wordle-tile-letter">{letter}</Text>
    </Animated.View>
  );
});
```

#### Share Results
```typescript
// React - Share functionality (cross-platform)
import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';

const shareResults = useCallback(async () => {
  const puzzleNumber = getPuzzleNumber();
  const emoji = guesses
    .map(guess =>
      guess.result
        .map(r => r.status === 'correct' ? '🟩' :
                  r.status === 'present' ? '🟨' : '⬜')
        .join('')
    )
    .join('\n');

  const text = `Paròla ${puzzleNumber} ${
    gameState === 'won' ? guesses.length : 'X'
  }/6\n\n${emoji}`;

  if (Platform.OS === 'web' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    await Clipboard.setStringAsync(text);
  }

  showToast({ message: 'Copiato negli appunti!', type: 'success' });
}, [guesses, gameState, showToast]);
```

---

## 3. TopNav Component

### Svelte Implementation
```svelte
<script lang="ts">
  let menuOpen = $state(false);
</script>

<nav class="cds-nav">
  <div class="cds-nav__container">
    <a href="/" class="cds-nav__brand">Caccia alle Parole</a>
    <button onclick={() => (menuOpen = !menuOpen)}>Menu</button>
  </div>
</nav>
```

### React Translation
```typescript
import { Link } from 'expo-router';
import { Pressable, View, Text } from 'react-native';

export function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View className="cds-nav">
      <View className="cds-nav__container">
        <Link href="/" asChild>
          <Pressable>
            <Text className="cds-nav__brand">Caccia alle Parole</Text>
          </Pressable>
        </Link>

        <Pressable onPress={() => setMenuOpen(!menuOpen)}>
          <Text>Menu</Text>
        </Pressable>
      </View>

      {menuOpen && (
        <View className="cds-nav__menu">
          <Link href="/caccia" asChild>
            <Pressable onPress={() => setMenuOpen(false)}>
              <Text>Caccia alle Parole</Text>
            </Pressable>
          </Link>

          <Link href="/parola" asChild>
            <Pressable onPress={() => setMenuOpen(false)}>
              <Text>Paròla</Text>
            </Pressable>
          </Link>
        </View>
      )}
    </View>
  );
}
```

---

## 4. Toast Component

### Svelte Implementation
```svelte
<script lang="ts">
  import { toastStore } from '$lib/stores/toast';
</script>

{#each $toastStore as toast}
  <div class="cds-toast cds-toast--{toast.type}">
    {toast.message}
  </div>
{/each}
```

### React Translation
```typescript
import { useToast } from '@/lib/stores/toast';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

export function Toast() {
  const { toasts } = useToast();

  return (
    <View
      className="cds-toast-container"
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 9999
      }}
    >
      {toasts.map(toast => (
        <Animated.View
          key={toast.id}
          entering={FadeInDown}
          exiting={FadeOutUp}
          className={`cds-toast cds-toast--${toast.type}`}
        >
          <Text className="cds-toast-message">{toast.message}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

// Store implementation
type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
};

const ToastContext = createContext<{
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
}>(null!);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };

    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      hideToast(id);
    }, toast.duration);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
```

---

## 5. Modal Component

### Svelte Implementation
```svelte
{#if showModal}
  <div
    class="cds-modal"
    onclick={() => (showModal = false)}
    role="dialog"
  >
    <div class="cds-modal__backdrop"></div>
    <div class="cds-modal__content" onclick={(e) => e.stopPropagation()}>
      <slot />
    </div>
  </div>
{/if}
```

### React Translation
```typescript
import { Modal as RNModal, Pressable, View } from 'react-native';
import type { ReactNode } from 'react';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ visible, onClose, children }: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="cds-modal"
        onPress={onClose}
        style={{ flex: 1 }}
      >
        <View className="cds-modal__backdrop" />

        <View className="cds-modal__wrapper">
          <Pressable onPress={e => e.stopPropagation()}>
            <View className="cds-modal__content">
              {children}
            </View>
          </Pressable>
        </View>
      </Pressable>
    </RNModal>
  );
}

// Usage
<Modal visible={showModal} onClose={() => setShowModal(false)}>
  <View className="cds-modal__header">
    <Text className="cds-modal__title">Complimenti!</Text>
  </View>
  <View className="cds-modal__body">
    <Text>Hai trovato tutte le {totalWords} parole!</Text>
  </View>
  <View className="cds-modal__footer">
    <Pressable onPress={newGame} className="cds-button cds-button--primary">
      <Text>Gioca Ancora</Text>
    </Pressable>
  </View>
</Modal>
```

---

## 6. Confetti Component

### Svelte Implementation
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import confetti from 'canvas-confetti';

  let { trigger } = $props<{ trigger: boolean }>();

  $effect(() => {
    if (trigger) {
      confetti({ particleCount: 100 });
    }
  });
</script>
```

### React Translation (Web)
```typescript
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Platform } from 'react-native';

interface ConfettiProps {
  trigger: boolean;
}

export function Confetti({ trigger }: ConfettiProps) {
  useEffect(() => {
    if (!trigger || Platform.OS !== 'web') return;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#e63946', '#2a9d8f', '#e9c46a']
    });
  }, [trigger]);

  return null; // Web-only, renders to canvas
}
```

### React Translation (Native - Lottie)
```typescript
import LottieView from 'lottie-react-native';
import { useRef, useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';

export function Confetti({ trigger }: ConfettiProps) {
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
      style={StyleSheet.absoluteFill}
      loop={false}
      autoPlay={false}
      pointerEvents="none"
    />
  );
}
```

---

## 7. Button Component

### Svelte Implementation
```svelte
<button class="cds-button cds-button--{variant}" {disabled}>
  <slot />
</button>
```

### React Translation
```typescript
import { Pressable, Text, type PressableProps } from 'react-native';
import { cn } from '@/lib/utils';

interface ButtonProps extends PressableProps {
  variant?: 'primary' | 'outline' | 'ghost';
  disabled?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      className={cn(
        'cds-button',
        `cds-button--${variant}`,
        disabled && 'cds-button--disabled',
        className
      )}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text className="cds-button-text">{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

// Usage
<Button variant="primary" onPress={handleClick}>
  Nuova Partita
</Button>
```

---

## 8. Card Component

### Svelte Implementation
```svelte
<div class="cds-card">
  <slot />
</div>
```

### React Translation
```typescript
import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View className={cn('cds-card', className)} {...props}>
      {children}
    </View>
  );
}

// Usage
<Card>
  <Text className="cds-heading-3">Caccia alle Parole</Text>
  <Text className="cds-text-secondary">Word Search Puzzle</Text>
</Card>
```

---

## Utility: `cn` Helper

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Summary: Key Patterns

### 1. State
- `$state()` → `useState()`
- `$derived()` → `useMemo()`
- `$effect()` → `useEffect()`

### 2. Components
- `<div>` → `<View>`
- `<span>`, `<p>` → `<Text>`
- `<button>` → `<Pressable>`
- `<a>` → `<Link>` (expo-router)

### 3. Events
- `onclick` → `onPress`
- `onpointerdown` → `onPressIn` / Gesture Handler
- `onkeydown` → `useEffect` with window listener (web only)

### 4. Conditionals
- `{#if}` → `{condition && <View />}`
- `{#each}` → `{items.map(item => <Item key={item.id} />)}`

### 5. Slots
- `<slot />` → `children` prop

### 6. Stores
- `$store.value` → `useStore(s => s.value)`
- `store.update()` → `setState()` or Zustand action

### 7. Styling
- `class="..."` → `className="..."`
- Scoped `<style>` → `global.css` or `StyleSheet.create()`

---

## Complete Component Checklist

- [ ] WordSearchGame (657 lines → ~800 lines React)
- [ ] WordleGame (264 lines → ~350 lines React)
- [ ] TopNav (~50 lines → ~70 lines React)
- [ ] Toast (~40 lines → ~100 lines React with context)
- [ ] Modal (~30 lines → ~50 lines React)
- [ ] Confetti (~20 lines → ~60 lines React with platform split)
- [ ] Button (~15 lines → ~30 lines React)
- [ ] Card (~10 lines → ~20 lines React)
- [ ] Input (~30 lines → ~40 lines React)

**Total LOC:** ~1,100 Svelte → ~1,600 React (expected 45% increase due to TypeScript verbosity and platform-specific code)
