<script lang="ts">
  import { onMount } from "svelte";
  import { wordleStore, wordleUI, getPuzzleNumber } from "$lib/stores/wordle";
  import Confetti from "$lib/components/ui/Confetti.svelte";
  import { fade, fly, scale } from "svelte/transition";

  const KEYBOARD_ROWS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
  ];

  let triggerConfetti = false;

  let emptyRows = $derived(
    Math.max(
      0,
      6 -
        $wordleStore.guesses.length -
        ($wordleStore.gameState === "playing" ? 1 : 0),
    ),
  );

  onMount(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ($wordleStore.gameState !== "playing") return;

      if (e.key === "Enter") {
        wordleStore.submitGuess();
      } else if (e.key === "Backspace") {
        wordleStore.deleteLetter();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        wordleStore.addLetter(e.key.toUpperCase());
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  });

  $effect(() => {
    if ($wordleStore.gameState !== "playing" && !$wordleUI.showModal) {
      if ($wordleStore.gameState === "won") {
        triggerConfetti = true;
      }
      setTimeout(() => {
        $wordleUI.showModal = true;
      }, 1500);
    }
  });

  function handleKeyClick(key: string) {
    if (key === "ENTER") {
      wordleStore.submitGuess();
    } else if (key === "⌫") {
      wordleStore.deleteLetter();
    } else {
      wordleStore.addLetter(key);
    }
  }

  function shareResults() {
    const puzzleNumber = getPuzzleNumber();
    const emoji = $wordleStore.guesses
      .map((guess) =>
        guess.result
          .map((r) =>
            r.status === "correct"
              ? "🟩"
              : r.status === "present"
                ? "🟨"
                : "⬜",
          )
          .join(""),
      )
      .join("\n");

    const text = `Caccia Paròle ${puzzleNumber} ${$wordleStore.gameState === "won" ? $wordleStore.guesses.length : "X"}/6\n\n${emoji}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }
</script>

<div class="game-container">
  <!-- Header/Nav -->

  <main class="board-area">
    <div class="grid-board">
      {#each $wordleStore.guesses as guess, rowIndex}
        <div class="row">
          {#each guess.result as letter, colIndex}
            <div
              class="tile tile-evaluated tile-{letter.status}"
              class:tile-flip={rowIndex === $wordleStore.guesses.length - 1}
              style="animation-delay: {colIndex * 150}ms"
            >
              <div class="tile-inner">
                <div class="tile-front">{letter.letter}</div>
                <div class="tile-back">{letter.letter}</div>
              </div>
            </div>
          {/each}
        </div>
      {/each}

      {#if $wordleStore.gameState === "playing"}
        <div class="row">
          {#each Array(5) as _, i}
            <div
              class="tile tile-active"
              class:tile-has-letter={$wordleStore.currentGuess[i]}
            >
              {$wordleStore.currentGuess[i] || ""}
            </div>
          {/each}
        </div>
      {/if}

      {#each Array(emptyRows) as _}
        <div class="row">
          {#each Array(5) as _}
            <div class="tile tile-empty"></div>
          {/each}
        </div>
      {/each}
    </div>
  </main>

  <footer class="keyboard-area">
    <div class="keyboard">
      {#each KEYBOARD_ROWS as row}
        <div class="kb-row">
          {#each row as key}
            <button
              onclick={() => handleKeyClick(key)}
              class="key {key.length > 1 ? 'key-wide' : ''} key-{$wordleStore
                .keyboardState[key] || 'default'}"
            >
              {#if key === "⌫"}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="3"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12l-2.25 2.25m-8.5-6.75h16.5a1.5 1.5 0 0 1 1.5 1.5v6.75a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V9.75a1.5 1.5 0 0 1 1.5-1.5Z"
                  />
                </svg>
              {:else}
                {key}
              {/if}
            </button>
          {/each}
        </div>
      {/each}
    </div>
  </footer>
</div>

{#if $wordleUI.showModal}
  <div
    class="modal-backdrop"
    onclick={() => ($wordleUI.showModal = false)}
    role="dialog"
    aria-modal="true"
    transition:fade
  >
    <div
      class="modal-content"
      onclick={(e) => e.stopPropagation()}
      transition:scale={{ duration: 400, start: 0.8 }}
    >
      <button class="modal-close" onclick={() => ($wordleUI.showModal = false)}>
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
            d="M6 18 18 6M6 6l12 12"
          />
        </svg>
      </button>

      {#if $wordleStore.gameState === "playing"}
        <div class="how-to-play">
          <div class="result-icon">💡</div>
          <h2>Come Giocare</h2>
          <p>Indovina la <strong>PAROLA</strong> in 6 tentativi.</p>
          <ul class="rules-list">
            <li>Ogni tentativo deve essere di 5 lettere.</li>
            <li>
              Il colore delle tessere cambierà per mostrare quanto sei vicino.
            </li>
          </ul>

          <div class="examples-box">
            <div class="example">
              <div class="example-row">
                <div class="mini-tile correct">C</div>
                <div class="mini-tile">A</div>
                <div class="mini-tile">N</div>
                <div class="mini-tile">E</div>
                <div class="mini-tile">S</div>
              </div>
              <p>
                La lettera <strong>C</strong> è nella parola e nel posto giusto.
              </p>
            </div>
          </div>
        </div>
      {:else}
        <div class="game-results">
          <div class="result-icon">
            {$wordleStore.gameState === "won" ? "🏆" : "🎭"}
          </div>
          <h2>
            {$wordleStore.gameState === "won" ? "Bravo!" : "Riprova domani"}
          </h2>

          <div class="target-card">
            <span class="label">La parola era</span>
            <div class="word">{$wordleStore.targetWord}</div>
            <p class="translation">{$wordleStore.translation}</p>
            <p class="definition">"{$wordleStore.definition}"</p>
          </div>

          <div class="stats-row">
            <div class="stat-item">
              <span class="stat-val"
                >{$wordleStore.gameState === "won"
                  ? $wordleStore.guesses.length
                  : "X"}</span
              >
              <span class="stat-lbl">Tentativi</span>
            </div>
          </div>

          <button class="share-btn" onclick={shareResults}>
            <span>Condividi Risultato</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              ><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline
                points="16 6 12 2 8 6"
              /><line x1="12" x2="12" y1="2" y2="15" /></svg
            >
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<Confetti trigger={triggerConfetti} />

<style>
  :root {
    --wordle-correct: var(--cds-color-success);
    --wordle-present: var(--cds-color-warning);
    --wordle-absent: var(--cds-color-gray-500);
    --wordle-border: var(--cds-color-gray-300);
    --wordle-keyboard-bg: var(--cds-color-gray-200);
  }

  .game-container {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    padding-top: 72px; /* TopNav height */
    max-width: 500px;
    margin: 0 auto;
    background: var(--cds-color-background);
    overflow: hidden;
    position: relative;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.05);
  }

  .board-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    min-height: 0;
    overflow: hidden;
  }

  .grid-board {
    display: flex;
    flex-direction: column;
    gap: 6px;
    height: 100%;
    max-height: 420px;
    width: 100%;
    max-width: 350px;
    aspect-ratio: 5/6;
  }

  .row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    flex: 1;
  }

  .tile {
    border: 2px solid var(--wordle-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(1.2rem, 5vh, 2rem);
    font-weight: 800;
    text-transform: uppercase;
    border-radius: 6px;
    user-select: none;
    transition: all 0.1s;
    background: white;
    color: var(--cds-color-text-primary);
  }

  .tile-active {
    border-color: var(--cds-color-gray-400);
  }
  .tile-has-letter {
    border-color: var(--cds-color-text-primary);
    animation: tile-pop 100ms ease-out;
  }

  .tile-evaluated {
    border: none;
    color: white;
    perspective: 1000px;
  }
  .tile-inner {
    position: relative;
    width: 100%;
    height: 100%;
    text-align: center;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    transform-style: preserve-3d;
  }
  .tile-flip .tile-inner {
    transform: rotateX(180deg);
  }
  .tile-front,
  .tile-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }
  .tile-back {
    transform: rotateX(180deg);
  }

  .tile-correct .tile-back {
    background-color: var(--wordle-correct);
  }
  .tile-present .tile-back {
    background-color: var(--wordle-present);
  }
  .tile-absent .tile-back {
    background-color: var(--wordle-absent);
  }

  .tile-evaluated:not(.tile-flip).tile-correct {
    background-color: var(--wordle-correct);
  }
  .tile-evaluated:not(.tile-flip).tile-present {
    background-color: var(--wordle-present);
  }
  .tile-evaluated:not(.tile-flip).tile-absent {
    background-color: var(--wordle-absent);
  }

  .keyboard-area {
    padding: 8px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(10px);
    border-top: 1px solid var(--cds-color-border);
    flex-shrink: 0;
  }

  .keyboard {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 480px;
    margin: 0 auto;
  }

  .kb-row {
    display: flex;
    justify-content: center;
    gap: 4px;
  }

  .key {
    height: clamp(44px, 7vh, 56px);
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--wordle-keyboard-bg);
    border: none;
    border-radius: 6px;
    font-weight: 700;
    font-size: clamp(0.75rem, 2vh, 0.9rem);
    color: var(--cds-color-text-primary);
    cursor: pointer;
    transition: all 0.1s;
    touch-action: manipulation;
  }
  .key:active {
    transform: scale(0.95);
    background: var(--cds-color-gray-300);
  }
  .key-wide {
    flex: 1.5;
    font-size: 0.75rem;
  }

  .key-correct {
    background-color: var(--wordle-correct);
    color: white;
  }
  .key-present {
    background-color: var(--wordle-present);
    color: white;
  }
  .key-absent {
    background-color: var(--wordle-absent);
    color: white;
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
    border-radius: 28px;
    padding: 32px;
    position: relative;
    box-shadow: var(--cds-shadow-modal);
    max-height: 85vh;
    overflow-y: auto;
  }

  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: var(--cds-color-gray-50);
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--cds-color-text-tertiary);
  }

  .result-icon {
    font-size: 3rem;
    margin-bottom: 12px;
    text-align: center;
  }
  .modal-content h2 {
    font-family: var(--cds-font-family-display);
    font-size: 1.75rem;
    font-weight: 800;
    margin-bottom: 20px;
    text-align: center;
  }

  .rules-list {
    list-style: none;
    padding: 0;
    margin: 16px 0;
    text-align: left;
  }
  .rules-list li {
    margin-bottom: 8px;
    display: flex;
    gap: 10px;
    font-size: 0.9rem;
    line-height: 1.4;
  }
  .rules-list li::before {
    content: "•";
    color: var(--cds-color-primary);
    font-weight: 900;
  }

  .target-card {
    background: var(--cds-color-gray-50);
    border-radius: 16px;
    padding: 20px;
    margin: 20px 0;
    border: 1px solid var(--cds-color-border);
    text-align: center;
  }
  .target-card .word {
    font-family: var(--cds-font-family-display);
    font-size: 2rem;
    font-weight: 800;
    color: var(--cds-color-primary);
    margin: 4px 0;
  }
  .target-card .definition {
    font-size: 0.8rem;
    color: var(--cds-color-text-tertiary);
    font-style: italic;
  }

  .share-btn {
    width: 100%;
    background: var(--cds-gradient-primary);
    color: white;
    border: none;
    padding: 14px;
    border-radius: 12px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: var(--cds-shadow-button);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  @keyframes tile-pop {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }

  @media (max-width: 400px) {
    .grid-board {
      gap: 4px;
    }
    .row {
      gap: 4px;
    }
    .kb-row {
      gap: 3px;
    }
  }

  @media (max-height: 650px) {
    .board-area {
      padding: 5px;
    }
    .grid-board {
      max-height: 320px;
    }
    .tile {
      font-size: 1.25rem;
    }
    .key {
      height: 42px;
    }
    .keyboard-area {
      padding-bottom: 8px;
    }
  }
</style>
