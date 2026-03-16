<script lang="ts">
  import { onMount } from "svelte";
  import { impiccatoStore } from "$lib/stores/impiccato";
  import Confetti from "$lib/components/ui/Confetti.svelte";
  import { fade, fly, scale } from "svelte/transition";

  const KEYBOARD_LAYOUT = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"],
  ];

  let showModal = false;
  let triggerConfetti = false;
  let canvas: HTMLCanvasElement;

  $effect(() => {
    if ($impiccatoStore.gameState !== "playing" && !showModal) {
      if ($impiccatoStore.gameState === "won") triggerConfetti = true;
      setTimeout(() => {
        showModal = true;
      }, 500);
    }
  });

  function getDisplayWord(): string[] {
    return $impiccatoStore.targetWord.split("").map((letter) => {
      if (letter === " ") return " ";
      if (letter === "-") return "-";
      if (letter === "'") return "'";
      return $impiccatoStore.guessedLetters.has(letter) ? letter : "";
    });
  }

  function isLetterGuessed(letter: string): boolean {
    return $impiccatoStore.guessedLetters.has(letter);
  }

  function isLetterCorrect(letter: string): boolean {
    return (
      $impiccatoStore.targetWord.includes(letter) && isLetterGuessed(letter)
    );
  }

  function isLetterWrong(letter: string): boolean {
    return (
      !$impiccatoStore.targetWord.includes(letter) && isLetterGuessed(letter)
    );
  }

  function handleKeyClick(letter: string) {
    if ($impiccatoStore.gameState === "playing") {
      impiccatoStore.guessLetter(letter);
    }
  }

  function drawHangman(ctx: CanvasRenderingContext2D) {
    const lives = $impiccatoStore.remainingLives;
    const mistakes = 6 - lives;

    ctx.clearRect(0, 0, 200, 300);
    ctx.strokeStyle = "#4338ca"; // Indigo 700
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Base & Gallows - Drawing with a slight "hand-drawn" feel
    if (mistakes >= 1) {
      // Ground
      ctx.beginPath();
      ctx.moveTo(20, 280);
      ctx.lineTo(180, 280);
      ctx.stroke();
    }
    if (mistakes >= 2) {
      // Vertical
      ctx.beginPath();
      ctx.moveTo(60, 280);
      ctx.lineTo(60, 40);
      ctx.stroke();
    }
    if (mistakes >= 3) {
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(60, 40);
      ctx.lineTo(140, 40);
      ctx.stroke();
    }
    if (mistakes >= 4) {
      // Rope
      ctx.strokeStyle = "#d97706"; // Amber 600
      ctx.beginPath();
      ctx.moveTo(140, 40);
      ctx.lineTo(140, 70);
      ctx.stroke();
    }

    ctx.strokeStyle = "#1e293b"; // Slate 800
    // Man
    if (mistakes >= 5) {
      // Head
      ctx.beginPath();
      ctx.arc(140, 95, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (mistakes >= 6) {
      // Final State
      // Body
      ctx.beginPath();
      ctx.moveTo(140, 115);
      ctx.lineTo(140, 180);
      ctx.stroke();
      // Arms
      ctx.beginPath();
      ctx.moveTo(140, 130);
      ctx.lineTo(115, 160);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(140, 130);
      ctx.lineTo(165, 160);
      ctx.stroke();
      // Legs
      ctx.beginPath();
      ctx.moveTo(140, 180);
      ctx.lineTo(120, 230);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(140, 180);
      ctx.lineTo(160, 230);
      ctx.stroke();
    }
  }

  $effect(() => {
    if (canvas && $impiccatoStore) {
      const ctx = canvas.getContext("2d");
      if (ctx) drawHangman(ctx);
    }
  });

  onMount(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ($impiccatoStore.gameState !== "playing") return;
      if (/^[a-zA-Z]$/.test(e.key)) {
        impiccatoStore.guessLetter(e.key.toUpperCase());
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
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
      <h1>L'Impiccato</h1>
      <span class="game-info">Sfida Classica</span>
    </div>
    <button class="settings-btn" onclick={() => impiccatoStore.newGame()}>
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
    <div class="game-upper">
      <div class="illustration-panel" in:fade>
        <div class="category-pill">
          <span class="cat-label">{$impiccatoStore.targetCategory}</span>
        </div>
        <canvas bind:this={canvas} width="200" height="300"></canvas>
      </div>

      <div class="status-panel">
        <div class="stat-card">
          <span class="label">Vite</span>
          <div class="hearts">
            {#each Array(6) as _, i}
              <div
                class="heart"
                class:lost={i >= $impiccatoStore.remainingLives}
              >
                {i < $impiccatoStore.remainingLives ? "❤️" : "💀"}
              </div>
            {/each}
          </div>
        </div>
        <div class="stat-card score">
          <span class="label">Punteggio</span>
          <span class="value">{$impiccatoStore.score}</span>
        </div>
      </div>
    </div>

    <div class="word-display" in:fly={{ y: 20, delay: 200 }}>
      {#each getDisplayWord() as letter}
        <div class="letter-slot" class:empty={letter === ""}>
          {letter}
        </div>
      {/each}
    </div>

    <div class="keyboard-area" in:fade={{ delay: 400 }}>
      {#each KEYBOARD_LAYOUT as row}
        <div class="kb-row">
          {#each row as letter}
            <button
              onclick={() => handleKeyClick(letter)}
              disabled={isLetterGuessed(letter) ||
                $impiccatoStore.gameState !== "playing"}
              class="key"
              class:correct={isLetterCorrect(letter)}
              class:wrong={isLetterWrong(letter)}
            >
              {letter}
            </button>
          {/each}
        </div>
      {/each}
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
        {$impiccatoStore.gameState === "won" ? "🎉" : "🎭"}
      </div>
      <h2>{$impiccatoStore.gameState === "won" ? "Vittoria!" : "Game Over"}</h2>

      <div class="answer-card">
        <span class="ans-label">La parola era</span>
        <div class="ans-word">{$impiccatoStore.targetWord}</div>
        <p class="ans-translation">{$impiccatoStore.targetTranslation}</p>
        <p class="ans-def">"{$impiccatoStore.targetDefinition}"</p>
      </div>

      <div class="modal-btns">
        <button
          onclick={() => {
            showModal = false;
            impiccatoStore.continueGame();
          }}
          class="primary-btn">Continua Sfida</button
        >
        <button
          onclick={() => {
            showModal = false;
            impiccatoStore.newGame();
          }}
          class="ghost-btn">Nuova Partita</button
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
    padding: 20px;
    gap: 24px;
    min-height: 0;
  }

  .game-upper {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    align-items: start;
  }

  .illustration-panel {
    background: white;
    border-radius: 24px;
    padding: 12px;
    border: 1px solid var(--cds-color-border);
    box-shadow: var(--cds-shadow-card);
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }

  .category-pill {
    position: absolute;
    top: 12px;
    right: 12px;
    background: var(--cds-color-primary-light);
    color: var(--cds-color-primary);
    padding: 4px 12px;
    border-radius: 99px;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  canvas {
    max-width: 100%;
    height: auto;
  }

  .status-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 120px;
  }
  .stat-card {
    background: white;
    padding: 16px;
    border-radius: 20px;
    border: 1px solid var(--cds-color-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .stat-card .label {
    font-size: 0.6rem;
    font-weight: 800;
    color: var(--cds-color-text-tertiary);
    text-transform: uppercase;
  }
  .hearts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    font-size: 1.25rem;
  }
  .heart.lost {
    filter: grayscale(1);
    opacity: 0.3;
  }
  .stat-card.score {
    background: var(--cds-color-success-light);
    border-color: var(--cds-color-success-light);
  }
  .stat-card.score .value {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--cds-color-success-active);
  }

  .word-display {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    background: white;
    border-radius: 20px;
    border: 1px solid var(--cds-color-border);
  }

  .letter-slot {
    width: 32px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--cds-font-family-display);
    font-size: 1.5rem;
    font-weight: 800;
    border-bottom: 3px solid var(--cds-color-gray-300);
    text-transform: uppercase;
  }
  .letter-slot.empty {
    border-color: var(--cds-color-primary);
  }

  .keyboard-area {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .kb-row {
    display: flex;
    justify-content: center;
    gap: 6px;
  }
  .key {
    flex: 1;
    max-width: 40px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid var(--cds-color-border);
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    transition: transform 0.1s;
  }
  .key:active:not(:disabled) {
    transform: translateY(3px);
  }
  .key:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .key.correct {
    border-color: transparent;
    background: var(--cds-color-success);
    color: white;
    box-shadow: 0 4px 0 #15803d;
    transform: translateY(-2px);
  }
  .key.wrong {
    background: var(--cds-color-gray-200);
    color: var(--cds-color-text-tertiary);
    border-color: transparent;
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

  @media (max-height: 700px) {
    .game-layout {
      gap: 12px;
    }
    .illustration-panel {
      transform: scale(0.9);
    }
    .letter-slot {
      width: 24px;
      height: 32px;
      font-size: 1.25rem;
    }
    .key {
      height: 40px;
    }
  }

  @media (min-width: 1024px) {
    .game-layout {
      display: grid;
      grid-template-columns: 360px 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 40px;
      padding: 0 40px 40px;
      align-items: center;
    }

    .game-upper {
      grid-column: 1;
      grid-row: 1 / -1;
      display: flex;
      flex-direction: column-reverse;
      gap: 20px;
      width: 100%;
    }

    .status-panel {
      width: 100%;
      flex-direction: row;
      justify-content: space-between;
    }

    .word-display {
      grid-column: 2;
      grid-row: 1;
      align-self: end;
      margin-bottom: 20px;
    }

    .keyboard-area {
      grid-column: 2;
      grid-row: 2;
      align-self: start;
      margin-top: 0;
      max-width: 700px;
      width: 100%;
      justify-self: center;
    }

    .key {
      height: 60px;
      font-size: 1.25rem;
    }

    .illustration-panel {
      padding: 30px;
    }
  }
</style>
