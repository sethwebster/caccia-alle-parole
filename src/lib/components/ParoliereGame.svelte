<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { paroliereStore, type Cell } from "$lib/stores/paroliere";
  import { validWords } from "$lib/data/wordle-valid-words";
  import Confetti from "$lib/components/ui/Confetti.svelte";
  import { fade, fly, scale } from "svelte/transition";

  let showModal = false;
  let isDragging = false;
  let triggerConfetti = false;

  $effect(() => {
    if ($paroliereStore.gameState === "finished" && !showModal) {
      if ($paroliereStore.score > 20) triggerConfetti = true;
      setTimeout(() => {
        showModal = true;
      }, 500);
    }
  });

  function isValidWord(word: string): boolean {
    return validWords.has(word.toUpperCase());
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function handleMouseDown(row: number, col: number) {
    isDragging = true;
    paroliereStore.clearSelection();
    paroliereStore.selectCell({
      letter: $paroliereStore.grid[row][col],
      row,
      col,
    });
  }

  function handleMouseEnter(row: number, col: number) {
    if (isDragging) {
      paroliereStore.selectCell({
        letter: $paroliereStore.grid[row][col],
        row,
        col,
      });
    }
  }

  function handleMouseUp() {
    if (isDragging) {
      isDragging = false;
      if ($paroliereStore.currentWord.length >= 3) {
        paroliereStore.submitWord(isValidWord);
      } else {
        paroliereStore.clearSelection();
      }
    }
  }

  function isCellSelected(row: number, col: number): boolean {
    return $paroliereStore.currentPath.some(
      (c) => c.row === row && c.col === col,
    );
  }

  onMount(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  });

  onDestroy(() => {
    paroliereStore.endGame();
  });
</script>

<div class="game-container">
  <!-- Game Header -->
  <header class="game-header">
    <a href="/" class="back-btn">
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
      <h1>Paroliere+</h1>
      {#if $paroliereStore.gameState === "playing"}
        <span class="game-info">Sfida a Tempo</span>
      {/if}
    </div>
    <button class="settings-btn" onclick={() => paroliereStore.endGame()}>
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

  {#if $paroliereStore.gameState === "setup"}
    <div class="setup-screen" in:fade>
      <div class="setup-card" in:fly={{ y: 20, duration: 600 }}>
        <div class="brand-icon">🎭</div>
        <h2>Pronto per la Sfida?</h2>
        <p class="setup-desc">
          Trova più parole possibili collegando le lettere adiacenti in 3
          minuti.
        </p>

        <div class="rules-box">
          <div class="rule-item">
            <span class="rule-icon">✨</span>
            <span>Trascina tra lettere adiacenti</span>
          </div>
          <div class="rule-item">
            <span class="rule-icon">📏</span>
            <span>Minimo 3 lettere per parola</span>
          </div>
          <div class="rule-item">
            <span class="rule-icon">💎</span>
            <span>Paròle lunghe = Più punti</span>
          </div>
        </div>

        <button onclick={() => paroliereStore.startGame()} class="start-btn">
          Inizia Partita
        </button>
      </div>
    </div>
  {:else}
    <div class="game-layout" in:fade>
      <div class="stats-bar">
        <div class="stat-pill" class:warning={$paroliereStore.timeLeft < 30}>
          <span class="pill-label">Tempo</span>
          <span class="pill-value">{formatTime($paroliereStore.timeLeft)}</span>
        </div>
        <div class="stat-pill score">
          <span class="pill-label">Punteggio</span>
          <span class="pill-value">{$paroliereStore.score}</span>
        </div>
        <div class="stat-pill ghost">
          <span class="pill-label">Parole</span>
          <span class="pill-value">{$paroliereStore.foundWords.size}</span>
        </div>
      </div>

      <div class="board-area">
        <div
          class="active-word-display"
          class:has-content={!!$paroliereStore.currentWord}
        >
          {$paroliereStore.currentWord || "Seleziona le lettere"}
        </div>

        <div class="grid-board">
          {#each $paroliereStore.grid as row, i}
            {#each row as letter, j}
              <button
                onmousedown={() => handleMouseDown(i, j)}
                onmouseenter={() => handleMouseEnter(i, j)}
                class="tile"
                class:is-selected={isCellSelected(i, j)}
                class:grabbing={isDragging}
              >
                <div class="tile-content">{letter}</div>
              </button>
            {/each}
          {/each}
        </div>

        {#if $paroliereStore.foundWords.size > 0}
          <div class="found-words-panel" in:fade>
            <h3>Parole Trovate</h3>
            <div class="word-chips">
              {#each Array.from($paroliereStore.foundWords).sort() as word}
                <span class="word-chip" in:scale>
                  {word}
                </span>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

{#if showModal}
  <div
    class="modal-backdrop"
    onclick={() => (showModal = false)}
    role="dialog"
    aria-modal="true"
    transition:fade
  >
    <div
      class="modal-content"
      onclick={(e) => e.stopPropagation()}
      transition:scale={{ duration: 400, start: 0.8 }}
    >
      <div class="reward-icon">🏆</div>
      <h2>Partita Finita!</h2>

      <div class="results-grid">
        <div class="result-item">
          <span class="label">Punteggio</span>
          <span class="value success">{$paroliereStore.score}</span>
        </div>
        <div class="result-item">
          <span class="label">Parole</span>
          <span class="value">{$paroliereStore.foundWords.size}</span>
        </div>
      </div>

      <div class="modal-btns">
        <button
          onclick={() => {
            showModal = false;
            paroliereStore.startGame();
          }}
          class="share-btn"
        >
          Gioca Ancora
        </button>
        <button onclick={() => (showModal = false)} class="back-link">
          Torna al Menu
        </button>
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

  /* Header */
  .game-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--cds-color-border);
    background: white;
    flex-shrink: 0;
  }

  .back-btn,
  .settings-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    color: var(--cds-color-text-secondary);
    transition: all 0.2s;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  .back-btn:hover,
  .settings-btn:hover {
    background: var(--cds-color-gray-100);
    color: var(--cds-color-text-primary);
  }
  .back-btn svg,
  .settings-btn svg {
    width: 20px;
    height: 20px;
  }

  .header-center h1 {
    font-family: var(--cds-font-family-display);
    font-size: 1.25rem;
    font-weight: 800;
    margin: 0;
    line-height: 1;
  }

  .game-info {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--cds-color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Setup Screen */
  .setup-screen {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .setup-card {
    background: white;
    padding: 40px;
    border-radius: 32px;
    width: 100%;
    max-width: 400px;
    box-shadow: var(--cds-shadow-card);
    border: 1px solid var(--cds-color-border);
    text-align: center;
  }

  .brand-icon {
    font-size: 3.5rem;
    margin-bottom: 24px;
  }
  .setup-card h2 {
    font-family: var(--cds-font-family-display);
    font-size: 1.75rem;
    font-weight: 800;
    margin-bottom: 12px;
  }
  .setup-desc {
    color: var(--cds-color-text-secondary);
    font-size: 0.95rem;
    margin-bottom: 32px;
  }

  .rules-box {
    background: var(--cds-color-gray-50);
    padding: 20px;
    border-radius: 20px;
    margin-bottom: 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: left;
  }

  .rule-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 600;
    font-size: 0.9rem;
  }
  .rule-icon {
    font-size: 1.25rem;
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
    transition: all 0.2s;
  }

  .start-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--cds-shadow-button-hover);
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
    padding: 16px;
    background: white;
    border-bottom: 1px solid var(--cds-color-border);
  }

  .stat-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
    background: var(--cds-color-gray-50);
    padding: 8px 12px;
    border-radius: 16px;
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
    font-size: 1.1rem;
  }
  .stat-pill.score {
    background: var(--cds-color-primary-light);
    border-color: var(--cds-color-primary-light);
    color: var(--cds-color-primary);
  }
  .stat-pill.warning {
    border-color: var(--cds-color-error);
    color: var(--cds-color-error);
  }

  .board-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
    gap: 24px;
    min-height: 0;
  }

  .active-word-display {
    width: 100%;
    height: 60px;
    background: white;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--cds-font-family-display);
    font-size: 1.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--cds-color-text-tertiary);
    border: 1px solid var(--cds-color-border);
  }

  .active-word-display.has-content {
    color: var(--cds-color-primary);
    background: var(--cds-color-primary-light);
    border-color: var(--cds-color-primary);
  }

  .grid-board {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    width: 100%;
    max-width: 360px;
    aspect-ratio: 1;
  }

  .tile {
    aspect-ratio: 1;
    background: white;
    border-radius: 16px;
    border: 2px solid var(--cds-color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    user-select: none;
    position: relative;
  }

  .tile.is-selected {
    background: var(--cds-color-primary);
    color: white;
    border-color: transparent;
    transform: scale(1.05);
    z-index: 2;
    box-shadow: var(--cds-shadow-button-hover);
  }

  .tile:not(.is-selected):hover {
    border-color: var(--cds-color-primary-light);
    background: var(--cds-color-gray-50);
  }

  .grabbing {
    cursor: grabbing !important;
  }

  /* Found Words */
  .found-words-panel {
    width: 100%;
    flex: 1;
    background: white;
    border-radius: 20px;
    padding: 20px;
    border: 1px solid var(--cds-color-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .found-words-panel h3 {
    font-size: 0.85rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--cds-color-text-tertiary);
    margin-bottom: 12px;
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
    background: var(--cds-color-secondary-light);
    color: var(--cds-color-secondary-active);
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.85rem;
    text-transform: uppercase;
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
    padding: 20px;
  }

  .modal-content {
    background: white;
    width: 100%;
    max-width: 400px;
    border-radius: 32px;
    padding: 48px 32px;
    text-align: center;
    box-shadow: var(--cds-shadow-modal);
  }

  .reward-icon {
    font-size: 4rem;
    margin-bottom: 20px;
  }
  .modal-content h2 {
    font-family: var(--cds-font-family-display);
    font-size: 2.25rem;
    font-weight: 800;
    margin-bottom: 24px;
  }

  .results-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 32px;
  }
  .result-item {
    background: var(--cds-color-gray-50);
    padding: 16px;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .result-item .label {
    font-size: 0.7rem;
    font-weight: 800;
    color: var(--cds-color-text-tertiary);
    text-transform: uppercase;
  }
  .result-item .value {
    font-size: 1.5rem;
    font-weight: 800;
  }
  .result-item .value.success {
    color: var(--cds-color-success);
  }

  .modal-btns {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .share-btn {
    background: var(--cds-gradient-primary);
    color: white;
    border: none;
    padding: 18px;
    border-radius: 16px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: var(--cds-shadow-button);
    transition: all 0.2s;
  }
  .share-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--cds-shadow-button-hover);
  }

  .back-link {
    background: none;
    border: none;
    color: var(--cds-color-text-tertiary);
    font-weight: 700;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .back-link:hover {
    color: var(--cds-color-text-primary);
  }

  @media (max-height: 750px) {
    .tile {
      font-size: 1.5rem;
      border-radius: 12px;
    }
    .setup-card {
      padding: 30px;
    }
    .reward-icon {
      font-size: 3rem;
    }
  }

  @media (min-width: 1024px) {
    .board-area {
      display: grid;
      grid-template-columns: auto 340px;
      grid-template-rows: auto 1fr;
      gap: 32px;
      max-width: 1000px;
      margin: 0 auto;
      width: 100%;
      height: 100%;
      align-content: center;
    }

    .active-word-display {
      grid-column: 1;
      grid-row: 1;
      width: 100%;
      max-width: 500px;
      justify-self: center;
      height: 80px;
      font-size: 2rem;
    }

    .grid-board {
      grid-column: 1;
      grid-row: 2;
      width: 500px;
      max-width: 500px;
      justify-self: center;
    }

    .found-words-panel {
      grid-column: 2;
      grid-row: 1 / -1;
      height: 100%;
      max-height: 700px;
      margin-top: 0;
    }
  }
</style>
