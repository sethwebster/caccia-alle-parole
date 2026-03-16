<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { anagrammiStore } from "$lib/stores/anagrammi";
  import Confetti from "$lib/components/ui/Confetti.svelte";
  import { fade, fly, scale } from "svelte/transition";

  let showModal = false;
  let triggerConfetti = false;

  $effect(() => {
    if ($anagrammiStore.gameState !== "playing" && !showModal) {
      if ($anagrammiStore.gameState === "correct") triggerConfetti = true;
      setTimeout(() => {
        showModal = true;
      }, 500);
    }
  });

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function handleLetterClick(letter: string) {
    anagrammiStore.addLetter(letter);
  }

  function handleKeyPress(e: KeyboardEvent) {
    if ($anagrammiStore.gameState !== "playing") return;
    if (e.key === "Enter") {
      anagrammiStore.submitGuess();
    } else if (e.key === "Backspace") {
      anagrammiStore.removeLetter();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      anagrammiStore.addLetter(e.key.toUpperCase());
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  });
</script>

<div class="game-container">
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
      <h1>Anagrammi+</h1>
      <span class="game-info">Dominio Verbale</span>
    </div>
    <button class="settings-btn" onclick={() => anagrammiStore.reset()}>
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

  <div class="game-layout">
    <div class="stats-bar">
      <div class="stat-pill" class:warning={$anagrammiStore.timeLeft < 15}>
        <span class="label">Tempo</span>
        <span class="value">{formatTime($anagrammiStore.timeLeft)}</span>
      </div>
      <div class="stat-pill score">
        <span class="label">Punteggio</span>
        <span class="value">{$anagrammiStore.score}</span>
      </div>
      <div class="stat-pill streak">
        <span class="label">Streak</span>
        <div class="streak-badge">
          🔥 <span class="value">{$anagrammiStore.streak}</span>
        </div>
      </div>
    </div>

    <div class="board-area">
      <div class="category-panel" in:fade>
        <span class="label">Categoria</span>
        <span class="value">{$anagrammiStore.category}</span>
      </div>

      <div class="scrambled-area" in:scale={{ duration: 400 }}>
        {#each $anagrammiStore.scrambledWord.split("") as letter, i}
          <button
            onclick={() => handleLetterClick(letter)}
            disabled={$anagrammiStore.gameState !== "playing"}
            class="letter-tile"
            in:fly={{ y: 20, delay: i * 50 }}
          >
            {letter}
          </button>
        {/each}
      </div>

      <div class="guess-area" in:fade={{ delay: 300 }}>
        <div class="slots-container">
          {#each Array($anagrammiStore.targetWord.length) as _, i}
            <div
              class="guess-slot"
              class:filled={i < $anagrammiStore.currentGuess.length}
            >
              {$anagrammiStore.currentGuess[i] || ""}
            </div>
          {/each}
        </div>
      </div>

      <div class="actions-area" in:fly={{ y: 20, delay: 500 }}>
        <button
          onclick={() => anagrammiStore.useHint()}
          disabled={$anagrammiStore.hintsUsed >= 2 ||
            $anagrammiStore.gameState !== "playing"}
          class="action-btn hint"
        >
          <span class="icon">💡</span>
          <span class="btn-text">Indizio ({2 - $anagrammiStore.hintsUsed})</span
          >
        </button>

        <button
          onclick={() => anagrammiStore.removeLetter()}
          disabled={$anagrammiStore.currentGuess.length === 0 ||
            $anagrammiStore.gameState !== "playing"}
          class="action-btn delete"
        >
          <span class="icon">⌫</span>
        </button>

        <button
          onclick={() => anagrammiStore.submitGuess()}
          disabled={$anagrammiStore.currentGuess.length !==
            $anagrammiStore.targetWord.length ||
            $anagrammiStore.gameState !== "playing"}
          class="action-btn submit"
        >
          <span class="icon">✓</span>
          <span class="btn-text">Invia</span>
        </button>

        <button
          onclick={() => anagrammiStore.skipWord()}
          disabled={$anagrammiStore.gameState !== "playing"}
          class="action-btn skip"
        >
          <span class="icon">⏭</span>
        </button>
      </div>
    </div>
  </div>
</div>

{#if showModal}
  <div
    class="modal-backdrop"
    onclick={() => (showModal = false)}
    transition:fade
  >
    <div
      class="modal-content"
      onclick={(e) => e.stopPropagation()}
      transition:scale={{ duration: 400, start: 0.8 }}
    >
      <div class="result-icon">
        {$anagrammiStore.gameState === "correct" ? "🌟" : "⏰"}
      </div>
      <h2>
        {$anagrammiStore.gameState === "correct"
          ? "Ottimo Anagramma!"
          : "Tempo Scaduto"}
      </h2>

      <div class="answer-card">
        <span class="ans-label">La parola corretta</span>
        <div class="ans-word">{$anagrammiStore.targetWord}</div>
        <p class="ans-translation">{$anagrammiStore.translation}</p>
        <p class="ans-def">"{$anagrammiStore.definition}"</p>
      </div>

      <div class="modal-btns">
        <button
          onclick={() => {
            showModal = false;
            anagrammiStore.nextWord();
          }}
          class="primary-btn">Prossima Parola</button
        >
        <button
          onclick={() => {
            showModal = false;
            anagrammiStore.reset();
          }}
          class="ghost-btn">Ricomincia Sfida</button
        >
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
  }

  .game-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: white;
    border-bottom: 1px solid var(--cds-color-border);
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
  .back-btn:hover {
    background: var(--cds-color-gray-100);
  }

  .game-layout {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .stats-bar {
    display: flex;
    justify-content: center;
    gap: 8px;
    padding: 16px;
    background: white;
    border-bottom: 1px solid var(--cds-color-border);
  }

  .stat-pill {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--cds-color-gray-50);
    padding: 8px;
    border-radius: 16px;
    border: 1px solid var(--cds-color-border);
  }
  .stat-pill .label {
    font-size: 0.6rem;
    font-weight: 800;
    color: var(--cds-color-text-tertiary);
    text-transform: uppercase;
  }
  .stat-pill .value {
    font-weight: 800;
    font-size: 1rem;
  }
  .stat-pill.score {
    background: var(--cds-color-success-light);
    border-color: var(--cds-color-success-light);
    color: var(--cds-color-success-active);
  }
  .stat-pill.streak {
    background: var(--cds-color-warning-light);
    border-color: var(--cds-color-warning-light);
    color: var(--cds-color-warning-active);
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
    gap: 32px;
  }

  .category-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: white;
    padding: 8px 24px;
    border-radius: 12px;
    border: 1px solid var(--cds-color-border);
  }
  .category-panel .label {
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--cds-color-text-tertiary);
  }
  .category-panel .value {
    font-weight: 800;
    text-transform: capitalize;
  }

  .scrambled-area {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .letter-tile {
    width: 52px;
    height: 52px;
    background: var(--cds-color-primary);
    color: white;
    border-radius: 14px;
    font-size: 1.5rem;
    font-weight: 800;
    border: none;
    box-shadow: 0 4px 0 #312e81;
    cursor: pointer;
    transition: all 0.1s;
  }
  .letter-tile:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 #312e81;
  }
  .letter-tile:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .guess-area {
    width: 100%;
    display: flex;
    justify-content: center;
  }
  .slots-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
  .guess-slot {
    width: 48px;
    height: 56px;
    background: white;
    border: 2px solid var(--cds-color-border);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 800;
    text-transform: uppercase;
    transition: all 0.2s;
  }
  .guess-slot.filled {
    border-color: var(--cds-color-primary);
    background: var(--cds-color-primary-light);
    color: var(--cds-color-primary);
  }

  .actions-area {
    margin-top: auto;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 12px;
    width: 100%;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    border-radius: 16px;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s;
  }
  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-btn.hint {
    grid-column: 1;
    background: var(--cds-color-warning-light);
    color: var(--cds-color-warning-active);
    padding: 16px;
  }
  .action-btn.delete {
    grid-column: 2;
    background: var(--cds-color-gray-100);
    color: var(--cds-color-text-secondary);
    padding: 16px;
    width: 60px;
  }
  .action-btn.submit {
    grid-column: 1;
    background: var(--cds-gradient-primary);
    color: white;
    padding: 18px;
    box-shadow: var(--cds-shadow-button);
    font-size: 1.1rem;
  }
  .action-btn.skip {
    grid-column: 2;
    background: var(--cds-color-error-light);
    color: var(--cds-color-error-active);
    padding: 18px;
    width: 60px;
  }

  .action-btn:active:not(:disabled) {
    transform: translateY(2px);
    opacity: 0.9;
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
    font-size: 1.75rem;
    font-weight: 800;
    margin-bottom: 24px;
  }

  .answer-card {
    background: var(--cds-color-gray-50);
    padding: 24px;
    border-radius: 20px;
    margin-bottom: 32px;
    border: 1px solid var(--cds-color-border);
  }
  .ans-label {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--cds-color-text-tertiary);
  }
  .ans-word {
    font-family: var(--cds-font-family-display);
    font-size: 2.25rem;
    font-weight: 800;
    color: var(--cds-color-primary);
    margin: 8px 0;
  }
  .ans-translation {
    font-weight: 700;
    margin-bottom: 8px;
  }
  .ans-def {
    font-size: 0.85rem;
    color: var(--cds-color-text-tertiary);
    font-style: italic;
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

  @media (max-width: 400px) {
    .letter-tile {
      width: 44px;
      height: 44px;
      font-size: 1.25rem;
    }
    .guess-slot {
      width: 40px;
      height: 48px;
      font-size: 1.25rem;
    }
  }

  @media (min-width: 1024px) {
    .board-area {
      display: grid;
      grid-template-columns: 1fr 320px;
      grid-template-rows: auto 1fr auto;
      align-content: center;
      padding: 40px;
      max-width: 1000px;
      margin: 0 auto;
      width: 100%;
      height: 100%;
    }

    .category-panel {
      grid-column: 2;
      grid-row: 1;
      width: 100%;
    }

    .scrambled-area {
      grid-column: 1;
      grid-row: 2;
      align-self: center;
    }

    .guess-area {
      grid-column: 1;
      grid-row: 3;
      align-self: start;
    }

    .actions-area {
      grid-column: 2;
      grid-row: 2 / span 2;
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 0;
    }

    .action-btn.hint,
    .action-btn.delete,
    .action-btn.submit,
    .action-btn.skip {
      grid-column: auto;
      width: 100%;
    }

    .letter-tile {
      width: 64px;
      height: 64px;
      font-size: 2rem;
    }

    .guess-slot {
      width: 56px;
      height: 64px;
      font-size: 2rem;
    }
  }
</style>
