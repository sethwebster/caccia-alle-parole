<script lang="ts">
	import { onMount } from 'svelte';
	import { wordleStore, wordleUI } from '$lib/stores/wordle';
	import Confetti from '$lib/components/ui/Confetti.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';

	const KEYBOARD_ROWS = [
		['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
		['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
		['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
	];

	let triggerConfetti = false;

	$: emptyRows = Math.max(0, 6 - $wordleStore.guesses.length - ($wordleStore.gameState === 'playing' ? 1 : 0));

	onMount(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if ($wordleStore.gameState !== 'playing') return;

			if (e.key === 'Enter') {
				wordleStore.submitGuess();
			} else if (e.key === 'Backspace') {
				wordleStore.deleteLetter();
			} else if (/^[a-zA-Z]$/.test(e.key)) {
				wordleStore.addLetter(e.key.toUpperCase());
			}
		};

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	$: if ($wordleStore.gameState !== 'playing' && !$wordleUI.showModal) {
		if ($wordleStore.gameState === 'won') {
			triggerConfetti = true;
		}
		setTimeout(() => { $wordleUI.showModal = true; }, 1500);
	}

	function handleKeyClick(key: string) {
		if (key === 'ENTER') {
			wordleStore.submitGuess();
		} else if (key === '⌫') {
			wordleStore.deleteLetter();
		} else {
			wordleStore.addLetter(key);
		}
	}

	function getPuzzleNumber() {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const epochDate = new Date('2026-01-26');
		return Math.floor((today.getTime() - epochDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
	}

	function shareResults() {
		const puzzleNumber = getPuzzleNumber();
		const emoji = $wordleStore.guesses.map(guess =>
			guess.result.map(r => r.status === 'correct' ? '🟩' : r.status === 'present' ? '🟨' : '⬜').join('')
		).join('\n');

		const text = `Paròla ${puzzleNumber} ${$wordleStore.gameState === 'won' ? $wordleStore.guesses.length : 'X'}/6\n\n${emoji}`;

		if (navigator.clipboard) {
			navigator.clipboard.writeText(text);
		}
	}
</script>

<div class="flex flex-col h-[calc(100dvh-80px)] max-w-md mx-auto w-full bg-[var(--cds-color-background)] overflow-hidden">
	<div class="flex-1 flex items-center justify-center p-2 min-h-0">
		<div class="grid grid-rows-6 gap-1.5 w-full max-h-full aspect-[5/6] max-w-[350px]">
			{#each $wordleStore.guesses as guess, rowIndex}
				<div class="grid grid-cols-5 gap-1.5">
					{#each guess.result as letter, colIndex}
						<div
							class="wordle-tile wordle-tile-evaluated wordle-tile-{letter.status}"
							class:wordle-tile-animate={rowIndex === $wordleStore.guesses.length - 1}
							style="animation-delay: {colIndex * 0.1}s"
						>
							{letter.letter}
						</div>
					{/each}
				</div>
			{/each}

			{#if $wordleStore.gameState === 'playing'}
				<div class="grid grid-cols-5 gap-1.5">
					{#each Array(5) as _, i}
						<div class="wordle-tile wordle-tile-active" class:wordle-tile-has-letter={$wordleStore.currentGuess[i]}>
							{$wordleStore.currentGuess[i] || ''}
						</div>
					{/each}
				</div>
			{/if}

			{#each Array(emptyRows) as _}
				<div class="grid grid-cols-5 gap-1.5">
					{#each Array(5) as _}
						<div class="wordle-tile"></div>
					{/each}
				</div>
			{/each}
		</div>
	</div>

	<div class="flex-none p-2 w-full max-w-[500px] mx-auto" style="padding-bottom: calc(0.25rem + env(safe-area-inset-bottom));">
		<div class="flex flex-col gap-1.5 w-full">
			{#each KEYBOARD_ROWS as row}
				<div class="flex gap-1.5 justify-center w-full">
					{#each row as key}
						<button
							on:click={() => handleKeyClick(key)}
							class="wordle-key {key.length > 1 ? 'flex-[1.5]' : 'flex-1'} wordle-key-{$wordleStore.keyboardState[key] || 'default'}"
						>
							{#if key === '⌫'}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12l-2.25 2.25m-8.5-6.75h16.5a1.5 1.5 0 0 1 1.5 1.5v6.75a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V9.75a1.5 1.5 0 0 1 1.5-1.5Z" />
                                </svg>
							{:else}
								{key}
							{/if}
						</button>
					{/each}
				</div>
			{/each}
		</div>
	</div>

	{#if $wordleUI.showModal}
		<div
			class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			on:click={() => $wordleUI.showModal = false}
			on:keydown={(e) => e.key === 'Escape' && ($wordleUI.showModal = false)}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="bg-[var(--cds-color-surface)] rounded-xl shadow-2xl p-6 w-full max-w-sm relative max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
                <button 
                    class="absolute top-4 right-4 text-[var(--cds-color-text-secondary)] hover:text-[var(--cds-color-text-primary)]"
                    on:click={() => $wordleUI.showModal = false}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>

				{#if $wordleStore.gameState === 'playing'}
					<div class="text-center mb-6">
						<h2 class="text-2xl font-bold mb-4 uppercase tracking-wider">Come Giocare</h2>
						<div class="text-left space-y-4 text-[var(--cds-color-text-primary)]">
							<p>Indovina la <strong>PARÒLA</strong> in 6 tentativi.</p>
							<ul class="list-disc pl-5 space-y-2 text-sm">
								<li>Ogni tentativo deve essere una parola valida di 5 lettere.</li>
								<li>Premi il tasto Invio per inviare.</li>
								<li>Dopo ogni tentativo, il colore delle tessere cambierà per mostrare quanto sei vicino.</li>
							</ul>
							
							<div class="space-y-3 mt-6 border-t pt-4 border-[var(--cds-color-border)]">
								<p class="text-xs font-bold uppercase text-[var(--cds-color-text-secondary)]">Esempi</p>
								<div>
									<div class="flex gap-1 mb-1">
										<div class="wordle-tile wordle-tile-correct w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">C</div>
										<div class="wordle-tile w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">A</div>
										<div class="wordle-tile w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">N</div>
										<div class="wordle-tile w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">E</div>
										<div class="wordle-tile w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">S</div>
									</div>
									<p class="text-sm"><strong>C</strong> è nella parola e nella posizione corretta.</p>
								</div>
								<div>
									<div class="flex gap-1 mb-1">
										<div class="wordle-tile w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">P</div>
										<div class="wordle-tile wordle-tile-present w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">I</div>
										<div class="wordle-tile w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">Z</div>
										<div class="wordle-tile w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">Z</div>
										<div class="wordle-tile w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">A</div>
									</div>
									<p class="text-sm"><strong>I</strong> è nella parola ma nella posizione sbagliata.</p>
								</div>
								<div>
									<div class="flex gap-1 mb-1">
										<div class="wordle-tile w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">M</div>
										<div class="wordle-tile w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">O</div>
										<div class="wordle-tile w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">N</div>
										<div class="wordle-tile w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">D</div>
										<div class="wordle-tile wordle-tile-absent w-8 h-8 text-lg" style="width: 2rem; height: 2rem;">O</div>
									</div>
									<p class="text-sm"><strong>O</strong> non è presente nella parola.</p>
								</div>
							</div>
						</div>
					</div>
				{:else}
					<div class="text-center mb-6">
						<h2 class="text-3xl font-bold mb-1 uppercase tracking-wider">
							{$wordleStore.gameState === 'won' ? 'Complimenti!' : 'Game Over'}
						</h2>
						<p class="text-sm text-[var(--cds-color-text-secondary)]">Puzzle #{getPuzzleNumber()}</p>
					</div>

					<div class="flex flex-col items-center gap-4 mb-8">
						<div class="bg-[var(--cds-color-surface-elevated)] border border-[var(--cds-color-border)] rounded-lg p-4 w-full text-center shadow-sm">
							<h3 class="text-xs uppercase tracking-wide text-[var(--cds-color-text-secondary)] mb-1">Parola del Giorno</h3>
							<p class="text-2xl font-bold text-[var(--cds-color-text-primary)] mb-1">{$wordleStore.targetWord}</p>
							<p class="text-lg text-[var(--cds-color-primary)]">{$wordleStore.targetWordData.translation}</p>
							<p class="text-sm mt-2 text-[var(--cds-color-text-secondary)] italic">"{$wordleStore.targetWordData.definition}"</p>
						</div>
					</div>
					
					<div class="flex gap-3">
						<button
							on:click={shareResults}
							class="flex-1 bg-[var(--wordle-correct)] text-white py-3 rounded-full font-bold uppercase tracking-wide hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
						>
							Share
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.287.696.345 1.084m-1.256-1.146a2.25 2.25 0 0 1 1.139-1.92m0 0c.349-.196.744-.29 1.14-.258m-1.528 1.932a2.25 2.25 0 0 1-.384 2.158m-1.808-4.088a2.25 2.25 0 0 1 2.158.384m-2.158-.384a2.25 2.25 0 0 0-2.316 2.592m2.62-3.132a2.25 2.25 0 0 0-2.31 2.95" />
							</svg>
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<Toast position="top" />
	<Confetti trigger={triggerConfetti} />
</div>

<style>
	.wordle-tile {
        width: 100%;
        height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: bold;
		text-transform: uppercase;
		border: 2px solid var(--wordle-empty);
		background-color: var(--wordle-tile-bg);
		color: var(--cds-color-text-primary);
		user-select: none;
        transition: transform 0.25s, border-color 0.25s;
	}

    @media (max-height: 700px) {
        .wordle-tile {
            font-size: 1.5rem;
        }
    }

	.wordle-tile-active {
        border-color: var(--wordle-absent); /* Darker gray for active input */
	}

    .wordle-tile-has-letter {
        border-color: var(--wordle-absent);
        animation: pop 0.1s;
    }

	.wordle-tile-evaluated {
		border-color: transparent;
		color: white;
	}

	.wordle-tile-animate {
		animation: flip 0.5s ease-in;
	}

	.wordle-tile-correct {
		background-color: var(--wordle-correct);
	}

	.wordle-tile-present {
		background-color: var(--wordle-present);
	}

	.wordle-tile-absent {
		background-color: var(--wordle-absent);
	}

	.wordle-key {
		height: 48px;
		border-radius: 4px;
		font-weight: bold;
		font-size: 0.875rem;
		text-transform: uppercase;
		cursor: pointer;
		user-select: none;
		border: none;
		transition: all 0.1s;
		display: flex;
		align-items: center;
		justify-content: center;
        touch-action: manipulation;
	}

    @media (min-width: 640px) {
        .wordle-key {
            height: 58px;
        }
    }

	.wordle-key-default {
		background-color: var(--wordle-keyboard-bg);
		color: var(--cds-color-text-primary);
	}

	.wordle-key-default:hover {
		opacity: 0.8;
	}

	.wordle-key-correct {
		background-color: var(--wordle-correct);
		color: white;
	}

	.wordle-key-present {
		background-color: var(--wordle-present);
		color: white;
	}

	.wordle-key-absent {
		background-color: var(--wordle-absent);
		color: white;
	}

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
</style>
