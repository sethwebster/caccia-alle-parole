<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { wordSearchStore } from "$lib/stores/wordSearch";
  import { wordDatabase, formatCategory } from "$lib/data/word-data";
  import { generateGrid } from "$lib/utils/gridGenerator";
  import {
    getCellsBetween,
    getWordFromCells,
    checkIfWordFound,
    type SelectedCell,
  } from "$lib/utils/wordDetection";
  import { getDirectionDelta } from '$lib/utils/gridGenerator';
  import type { Difficulty } from "$lib/types";
  import Confetti from "$lib/components/ui/Confetti.svelte";
  import { fade, fly, scale } from "svelte/transition";

  const categories = Object.keys(wordDatabase);
  const difficulties: Difficulty[] = ["easy", "medium", "hard"];
  const difficultyLabels: Record<Difficulty, string> = { easy: 'Facile', medium: 'Medio', hard: 'Difficile' };

  let selectedCategory = $state<string | null>($wordSearchStore.category);
  let selectedDifficulty = $state<Difficulty | null>(
    $wordSearchStore.difficulty,
  );
  let isSelecting = $state(false);
  let startCell = $state<SelectedCell | null>(null);
  let currentCell = $state<SelectedCell | null>(null);
  let selectedCells = $state<SelectedCell[]>([]);
  let showModal = $state(false);
  let gridElement = $state<HTMLElement | undefined>();
  let flashState = $state<"none" | "success" | "error">("none");
  let flashCells = $state<SelectedCell[]>([]);
  // Timeout handles must stay non-reactive: writing a $state handle inside
  // the win $effect re-triggers it infinitely (effect_update_depth_exceeded).
  let flashTimeout: ReturnType<typeof setTimeout> | null = null;
  let triggerConfetti = $state(false);

  let isGameActive = $derived(
    !!($wordSearchStore.category && $wordSearchStore.difficulty),
  );
  let foundCount = $derived($wordSearchStore.foundWords.size);
  let totalWords = $derived($wordSearchStore.words.length);
  let isGameWon = $derived(
    isGameActive && foundCount === totalWords && totalWords > 0,
  );
  let gridSize = $derived($wordSearchStore.grid.length);

  function normalizeWord(raw: string): string {
    return raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .toUpperCase();
  }

  function deriveCellsFromPlacement(
    word: any,
  ): { row: number; col: number }[] {
    if (word?.cells && word.cells.length) {
      return word.cells;
    }

    if (!word || typeof word.row !== 'number' || typeof word.col !== 'number' || !word.direction) {
      return [];
    }

    const placementWord = normalizeWord(word.word);
    const [dy, dx] = getDirectionDelta(word.direction);
    const cells: { row: number; col: number }[] = [];

    for (let i = 0; i < placementWord.length; i++) {
      cells.push({
        row: word.row + dy * i,
        col: word.col + dx * i,
      });
    }

    return cells;
  }

  // Plain variable, not $state: reading it must not re-trigger the effect,
  // otherwise dismissing the modal reopens it forever.
  let resultShown = false;

  $effect(() => {
    if (!isGameWon) {
      resultShown = false;
      return;
    }
    if (!resultShown) {
      resultShown = true;
      triggerConfetti = true;
      const t = setTimeout(() => {
        showModal = true;
      }, 500);
      return () => clearTimeout(t);
    }
  });

  function ensureSelectionsFromStore() {
    if (!selectedCategory && $wordSearchStore.category) {
      selectedCategory = $wordSearchStore.category;
    }

    if (!selectedDifficulty && $wordSearchStore.difficulty) {
      selectedDifficulty = $wordSearchStore.difficulty;
    }
  }

  function startWordSearchGame(category: string | null, difficulty: Difficulty | null) {
    if (!category || !difficulty) {
      return;
    }

    const categoryWords =
      wordDatabase[category as keyof typeof wordDatabase];
    if (!categoryWords) return;

    const { grid, placedWords } = generateGrid(categoryWords, difficulty);
    selectedCategory = category;
    selectedDifficulty = difficulty;
    triggerConfetti = false;
    wordSearchStore.setGame(category, difficulty, placedWords, grid);
  }

  function startGame() {
    ensureSelectionsFromStore();
    startWordSearchGame(selectedCategory, selectedDifficulty);
  }

  function getCellFromPointer(
    e: PointerEvent,
  ): { row: number; col: number } | null {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const cell = target?.closest(".cell") as HTMLElement | null;
    if (!cell) return null;

    const row = parseInt(cell.dataset.row || "-1");
    const col = parseInt(cell.dataset.col || "-1");

    if (row >= 0 && col >= 0) {
      return { row, col };
    }
    return null;
  }

  function handleGridPointerDown(e: PointerEvent) {
    if (!isGameActive || !gridElement) return;
    const cell = getCellFromPointer(e);
    if (!cell) return;

    e.preventDefault();
    gridElement.setPointerCapture(e.pointerId);
    isSelecting = true;
    startCell = {
      row: cell.row,
      col: cell.col,
      letter: $wordSearchStore.grid[cell.row][cell.col].letter,
    };
    currentCell = startCell;
    selectedCells = [startCell];
  }

  function handleGridPointerMove(e: PointerEvent) {
    if (!isSelecting || !startCell) return;
    const cell = getCellFromPointer(e);
    if (!cell) return;

    if (
      !currentCell ||
      cell.row !== currentCell.row ||
      cell.col !== currentCell.col
    ) {
      currentCell = {
        row: cell.row,
        col: cell.col,
        letter: $wordSearchStore.grid[cell.row][cell.col].letter,
      };
      selectedCells = getCellsBetween(
        startCell.row,
        startCell.col,
        currentCell.row,
        currentCell.col,
        $wordSearchStore.grid,
      );
    }
  }

  function wordsMatchByNormalized(found: string, target: string) {
    return normalizeWord(found) === normalizeWord(target);
  }

  function findFoundWord(word: string) {
    return $wordSearchStore.words.find((w) => wordsMatchByNormalized(w.word, word));
  }

  function handlePointerUp() {
    if (!isSelecting) return;
    isSelecting = false;
    if (selectedCells.length > 1) {
      const word = getWordFromCells(selectedCells);
      const isFound = checkIfWordFound(word, $wordSearchStore.words);
      if (isFound) {
        const normalized = (
          Array.from($wordSearchStore.foundWords).some((value) => wordsMatchByNormalized(value, isFound.word))
        );

        if (!normalized) {
          wordSearchStore.markWordFound(isFound.word);
        }

        // Force immediate visual success feedback for the selected run.
        triggerFlash("success", [...selectedCells]);
      } else {
        triggerFlash("error", [...selectedCells]);
      }
    }
    startCell = null;
    currentCell = null;
    selectedCells = [];
  }

  function triggerFlash(state: "success" | "error", cells: SelectedCell[]) {
    flashState = state;
    flashCells = cells;
    if (flashTimeout) clearTimeout(flashTimeout);
    flashTimeout = setTimeout(() => {
      flashState = "none";
      flashCells = [];
      flashTimeout = null;
    }, state === "error" ? 500 : 400);
  }

  let selectedCellSet = $derived(
    new Set(selectedCells.map((c) => (c ? `${c.row},${c.col}` : ""))),
  );
  let flashCellSet = $derived(
    new Set(flashCells.map((c) => (c ? `${c.row},${c.col}` : ""))),
  );
  let foundCellSet = $derived(
    new Set(
      Array.from($wordSearchStore.foundWords)
        .map((word) => {
          const wordData = findFoundWord(word);
          const cells = wordData ? deriveCellsFromPlacement(wordData) : [];
          return cells;
        })
        .flat()
        .map((c) => `${c.row},${c.col}`),
    ),
  );

  function resetGame() {
    wordSearchStore.reset();
    selectedCategory = null;
    selectedDifficulty = null;
    showModal = false;
    triggerConfetti = false;
  }

  function retryCurrentGame() {
    const fallbackCategory =
      selectedCategory || $wordSearchStore.category || categories[0] || null;
    const fallbackDifficulty =
      selectedDifficulty || $wordSearchStore.difficulty || 'easy';

    startWordSearchGame(fallbackCategory, fallbackDifficulty as Difficulty);
    showModal = false;
  }

  function selectCategory(category: string) {
    selectedCategory = category;
  }

  function selectDifficulty(difficulty: Difficulty) {
    selectedDifficulty = difficulty;
  }

  onMount(() => {
    const handleGlobalPointerUp = () => {
      if (isSelecting) handlePointerUp();
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  });

  onDestroy(() => {
    if (flashTimeout) clearTimeout(flashTimeout);
  });
</script>

<div class="game-container">
  <header class="game-header">
    <a href="/" class="back-btn" aria-label="Torna alla home">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2.5"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
        />
      </svg>
    </a>
    <div class="header-center">
      <h1>Caccia</h1>
      {#if isGameActive}
        <span class="game-info">{formatCategory(selectedCategory ?? '')} • {selectedDifficulty ? difficultyLabels[selectedDifficulty] : ''}</span>
      {/if}
    </div>
    <button class="settings-btn" aria-label="Nuova partita" onclick={resetGame}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
    </button>
  </header>

  {#if !isGameActive}
    <div class="setup-screen" in:fade>
      <div class="setup-card" in:fly={{ y: 20, duration: 600 }}>
        <h2>Nuova Caccia</h2>
        <div class="setup-form">
          <div class="form-group">
            <div class="form-label">Scegli una categoria</div>
            <div class="options-grid">
              {#each categories as category}
                <button
                  type="button"
                  class="option-btn"
                  class:active={selectedCategory === category}
                  onclick={() => selectCategory(category)}
                >
                  {formatCategory(category)}
                </button>
              {/each}
            </div>
          </div>

          <div class="form-group">
            <div class="form-label">Livello di difficoltà</div>
            <div class="options-grid cols-3">
              {#each difficulties as difficulty}
                <button
                  type="button"
                  class="option-btn"
                  class:active={selectedDifficulty === difficulty}
                  onclick={() => selectDifficulty(difficulty)}
                >
                  {difficultyLabels[difficulty]}
                </button>
              {/each}
            </div>
          </div>

          <button
            type="button"
            class="start-btn"
            disabled={!selectedCategory || !selectedDifficulty}
            onclick={startGame}
          >
            Inizia Partita
          </button>
        </div>
      </div>
    </div>
  {:else}
    <div class="game-layout">
      <div class="stats-bar">
        <div class="stat-pill">
          <span class="pill-label">Paròle</span>
          <span class="pill-value">{foundCount}/{totalWords}</span>
        </div>
        <div class="stat-pill score">
          <span class="pill-label">Punteggio</span>
          <span class="pill-value">{$wordSearchStore.score}</span>
        </div>
      </div>

      <div class="board-area">
        <div class="grid-wrapper">
          <div
            bind:this={gridElement}
            class="word-grid"
            style="grid-template-columns: repeat({gridSize}, 1fr);"
            onpointerdown={handleGridPointerDown}
            onpointermove={handleGridPointerMove}
            onpointerup={handlePointerUp}
          >
            {#each $wordSearchStore.grid as row, rowIndex}
              {#each row as cell, colIndex}
                <div
                  class="cell"
                  data-row={rowIndex}
                  data-col={colIndex}
                  class:is-selected={selectedCellSet.has(
                    `${rowIndex},${colIndex}`,
                  )}
                  class:is-found={foundCellSet.has(`${rowIndex},${colIndex}`)}
                  class:is-success={flashState === "success" &&
                    flashCellSet.has(`${rowIndex},${colIndex}`)}
                  class:is-error={flashState === "error" &&
                    flashCellSet.has(`${rowIndex},${colIndex}`)}
                >
                  {cell.letter}
                </div>
              {/each}
            {/each}
          </div>
        </div>

        <div class="word-list-panel">
          <div class="panel-header">
            <h3>Lista Paròle</h3>
            <span class="count">{foundCount} di {totalWords}</span>
          </div>
          <div class="word-chips">
            {#each $wordSearchStore.words as word}
              <div
                class="word-chip"
                class:found={$wordSearchStore.foundWords.has(word.word)}
              >
                <span class="word-it">{word.word}</span>
                <span class="word-en">{word.translation}</span>
                {#if $wordSearchStore.foundWords.has(word.word)}
                  <span class="found-badge">✓</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

{#if showModal}
  <div
    class="modal-backdrop"
    role="button"
    tabindex="0"
    aria-label="Chiudi risultato"
    onclick={(event) => {
      if (event.currentTarget === event.target) {
        resetGame();
      }
    }}
    onkeydown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        resetGame();
      }
    }}
    transition:fade
  >
    <div
      class="modal-content"
      transition:scale={{ duration: 400, start: 0.8 }}
    >
      <div class="result-icon">🏆</div>
      <h2>Partita Terminata!</h2>
      <p class="result-msg">
        Hai trovato tutte le parole in {formatCategory(selectedCategory ?? '')}!
      </p>

      <div class="stats-card">
        <div class="stat-row">
          <span class="label">Punteggio Finale</span>
          <span class="value success">{$wordSearchStore.score}</span>
        </div>
        <div class="stat-row">
          <span class="label">Difficoltà</span>
          <span class="value">{selectedDifficulty ? difficultyLabels[selectedDifficulty] : ''}</span>
        </div>
      </div>

      <div class="modal-btns">
        <button class="primary-btn" onclick={retryCurrentGame}>Rigioca</button>
        <button class="ghost-btn" onclick={resetGame}>Nuova Partita</button>
      </div>
    </div>
  </div>
{/if}

<Confetti trigger={triggerConfetti} />

<style>
  .game-container {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    background: var(--cds-color-background);
    overflow: hidden;
  }

  .game-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: white;
    border-bottom: 1px solid var(--cds-color-border);
    flex-shrink: 0;
  }

  .header-center h1 {
    font-family: var(--cds-font-family-display);
    font-size: 1.25rem;
    font-weight: 800;
    margin: 0;
  }
  .game-info {
    font-size: 0.7rem;
    color: var(--cds-color-text-tertiary);
    text-transform: uppercase;
    font-weight: 700;
  }

  .back-btn,
  .settings-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    color: var(--cds-color-text-secondary);
    border: none;
    background: transparent;
    cursor: pointer;
  }
  .back-btn:hover,
  .settings-btn:hover {
    background: var(--cds-color-gray-100);
  }

  /* Setup Screen */
  .setup-screen {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow-y: auto;
  }
  .setup-card {
    background: white;
    padding: 32px;
    border-radius: 24px;
    width: 100%;
    box-shadow: var(--cds-shadow-card);
    border: 1px solid var(--cds-color-border);
  }
  .setup-card h2 {
    font-family: var(--cds-font-family-display);
    font-size: 1.75rem;
    font-weight: 800;
    margin-bottom: 24px;
    text-align: center;
  }

  .form-group {
    margin-bottom: 24px;
  }
   .form-group .form-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--cds-color-text-secondary);
    margin-bottom: 12px;
    text-transform: uppercase;
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .options-grid.cols-3 {
    grid-template-columns: repeat(3, 1fr);
  }

  .option-btn {
    padding: 12px;
    border: 1px solid var(--cds-color-border);
    border-radius: 12px;
    background: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .option-btn:hover {
    border-color: var(--cds-color-primary);
    background: var(--cds-color-gray-50);
  }
  .option-btn.active {
    background: var(--cds-color-primary);
    color: white;
    border-color: transparent;
    box-shadow: var(--cds-shadow-sm);
  }

  .start-btn {
    width: 100%;
    padding: 18px;
    background: var(--cds-gradient-primary);
    color: white;
    border: none;
    border-radius: 16px;
    font-weight: 800;
    font-size: 1.1rem;
    cursor: pointer;
    box-shadow: var(--cds-shadow-button);
    margin-top: 12px;
  }
  .start-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  /* Game Layout */
  .game-layout {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .stats-bar {
    display: flex;
    justify-content: center;
    gap: 12px;
    padding: 12px;
    background: white;
    border-bottom: 1px solid var(--cds-color-border);
  }

  .stat-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 100px;
    background: var(--cds-color-gray-50);
    padding: 8px 12px;
    border-radius: 14px;
    border: 1px solid var(--cds-color-border);
  }
  .pill-label {
    font-size: 0.6rem;
    font-weight: 800;
    color: var(--cds-color-text-tertiary);
    text-transform: uppercase;
  }
  .pill-value {
    font-weight: 800;
    font-size: 1rem;
  }
  .stat-pill.score {
    background: var(--cds-color-primary-light);
    color: var(--cds-color-primary);
    border-color: var(--cds-color-primary-light);
  }

  .board-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px;
    gap: 20px;
    min-height: 0;
    overflow: hidden;
  }

  .grid-wrapper {
    flex: 0 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    max-height: 50vh;
  }

  .word-grid {
    display: grid;
    gap: 4px;
    background: white;
    border-radius: 12px;
    padding: 4px;
    border: 1px solid var(--cds-color-border);
    box-shadow: var(--cds-shadow-sm);
    width: 100%;
    max-width: min(480px, 100%);
    max-height: 50vh;
    aspect-ratio: 1;
    user-select: none;
    touch-action: none;
  }

  .cell {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: 800;
    border-radius: 6px;
    background: white;
    color: var(--cds-color-text-primary);
    transition: all 0.1s;
    border: 1px solid transparent;
    text-transform: uppercase;
  }

  .cell.is-selected {
    background: #f59e0b;
    color: white;
    border-color: #d97706;
    z-index: 1;
  }
  .cell.is-found {
    background: #22c55e;
    color: white;
    border-color: transparent;
    animation: cell-pop 0.3s;
  }
  .cell.is-success {
    background: #22c55e;
    color: white;
    border-color: transparent;
  }
  .cell.is-error {
    background: #ef4444;
    color: white;
    border-color: transparent;
    animation: cell-shake 0.5s;
  }

  .word-list-panel {
    background: white;
    border-radius: 20px;
    padding: 16px;
    border: 1px solid var(--cds-color-border);
    min-height: 160px;
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
  }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .panel-header h3 {
    font-size: 0.8rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--cds-color-text-tertiary);
    margin: 0;
  }
  .panel-header .count {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--cds-color-primary);
  }

  .word-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    overflow-y: auto;
    align-content: flex-start;
  }
  .word-chip {
    padding: 6px 12px;
    background: var(--cds-color-gray-50);
    border: 1px solid var(--cds-color-border);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    transition: all 0.2s;
  }
  .word-chip.found {
    background: var(--cds-color-success-light);
    border-color: var(--cds-color-success-light);
    color: #0f5132;
  }
  .word-chip .found-badge {
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.08rem;
    color: #14532d;
  }
  .word-chip.found .word-it {
    text-decoration: line-through;
  }

  .word-it {
    font-weight: 700;
    font-size: 0.85rem;
    text-transform: uppercase;
  }
  .word-en {
    font-size: 0.65rem;
    color: var(--cds-color-text-tertiary);
    font-weight: 600;
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: var(--cds-color-surface-overlay);
    backdrop-filter: var(--cds-blur-md);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 24px;
  }
  .modal-content {
    background: white;
    width: 100%;
    max-width: 400px;
    border-radius: 32px;
    padding: 40px 32px;
    text-align: center;
    box-shadow: var(--cds-shadow-modal);
  }
  .result-icon {
    font-size: 4rem;
    margin-bottom: 16px;
  }
  .modal-content h2 {
    font-family: var(--cds-font-family-display);
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 8px;
  }
  .result-msg {
    color: var(--cds-color-text-secondary);
    margin-bottom: 24px;
  }

  .stats-card {
    background: var(--cds-color-gray-50);
    border-radius: 20px;
    padding: 20px;
    margin-bottom: 32px;
    border: 1px solid var(--cds-color-border);
  }
  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
  }
  .stat-row:not(:last-child) {
    border-bottom: 1px solid var(--cds-color-border);
  }
  .stat-row .label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--cds-color-text-secondary);
  }
  .stat-row .value {
    font-weight: 800;
    font-size: 1.1rem;
  }
  .stat-row .value.success {
    color: var(--cds-color-success);
  }

  .modal-btns {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .primary-btn {
    background: var(--cds-gradient-primary);
    color: white;
    border: none;
    padding: 16px;
    border-radius: 14px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: var(--cds-shadow-button);
  }
  .ghost-btn {
    background: none;
    border: none;
    color: var(--cds-color-text-tertiary);
    font-weight: 700;
    cursor: pointer;
    padding: 8px;
  }

  @keyframes cell-pop {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.15);
    }
    100% {
      transform: scale(1);
    }
  }
  @keyframes cell-shake {
    0%,
    100% {
      transform: translateX(0);
    }
    20% {
      transform: translateX(-5px);
    }
    40% {
      transform: translateX(5px);
    }
    60% {
      transform: translateX(-5px);
    }
    80% {
      transform: translateX(5px);
    }
  }

  @media (max-width: 480px) {
    .cell {
      font-size: 0.9rem;
    }
    .word-list-panel {
      height: 140px;
    }
  }

  @media (min-width: 1024px) {
    .board-area {
      flex-direction: row;
      align-items: flex-start;
      padding: 40px;
      gap: 40px;
    }

    .grid-wrapper {
      flex: 1;
      height: auto;
      max-height: none;
      align-items: flex-start;
      padding-top: 0;
      justify-content: center;
    }

    .word-grid {
      max-height: 75vh;
      max-width: 75vh;
      width: auto;
      aspect-ratio: 1;
    }

    .word-list-panel {
      width: 360px;
      height: auto;
      max-height: 80vh;
      overflow-y: auto;
      margin-top: 0;
      flex: 0 0 auto;
    }

    .word-chips {
      overflow-y: visible;
    }
  }
</style>
