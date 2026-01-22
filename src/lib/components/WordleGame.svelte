<script lang="ts">
	import { onMount } from 'svelte';
	import { wordleStore } from '$lib/stores/wordle';
	import Confetti from '$lib/components/ui/Confetti.svelte';

	const KEYBOARD_ROWS = [
		['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
		['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
		['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
	];

	let showModal = false;
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

	$: if ($wordleStore.gameState !== 'playing' && !showModal) {
		if ($wordleStore.gameState === 'won') {
			triggerConfetti = true;
		}
		setTimeout(() => { showModal = true; }, 500);
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
		const epochDate = new Date('2024-01-01');
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

<style>
	.wordle-tile {
		width: 62px;
		height: 62px;
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
	}

	.wordle-tile-active {
		border-color: var(--cds-color-text-tertiary);
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
		min-width: 43px;
		height: 58px;
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
	}

	.wordle-key-wide {
		min-width: 65px;
		font-size: 0.75rem;
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

<div class="max-w-lg mx-auto p-4">
	<header class="text-center mb-8 border-b pb-4" style="border-color: var(--wordle-empty);">
		<h1 class="text-4xl font-bold tracking-wide">Paròla</h1>
		<p class="text-sm" style="color: var(--cds-color-text-secondary);">Puzzle #{getPuzzleNumber()}</p>
	</header>

	<div class="flex flex-col gap-1.5 mb-8">
		{#each $wordleStore.guesses as guess, rowIndex}
			<div class="flex gap-1.5 justify-center">
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
			<div class="flex gap-1.5 justify-center">
				{#each Array(5) as _, i}
					<div class="wordle-tile wordle-tile-active">
						{$wordleStore.currentGuess[i] || ''}
					</div>
				{/each}
			</div>
		{/if}

		{#each Array(emptyRows) as _}
			<div class="flex gap-1.5 justify-center">
				{#each Array(5) as _}
					<div class="wordle-tile"></div>
				{/each}
			</div>
		{/each}
	</div>

	<div class="flex flex-col gap-2">
		{#each KEYBOARD_ROWS as row}
			<div class="flex gap-1.5 justify-center">
				{#each row as key}
					<button
						on:click={() => handleKeyClick(key)}
						class="wordle-key {key.length > 1 ? 'wordle-key-wide' : ''} wordle-key-{$wordleStore.keyboardState[key] || 'default'}"
					>
						{key}
					</button>
				{/each}
			</div>
		{/each}
	</div>

	{#if showModal}
		<div
			class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
			on:click={() => showModal = false}
			on:keydown={(e) => e.key === 'Escape' && (showModal = false)}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="bg-surface rounded-lg p-8 max-w-md text-center" on:click|stopPropagation>
				<div class="bg-gradient-to-br from-success/20 to-primary/20 rounded-lg p-6 mb-6">
					<h2 class="text-2xl font-bold mb-4">
						{$wordleStore.gameState === 'won' ? 'Complimenti!' : 'Prossima volta!'}
					</h2>
					<p class="text-2xl mb-2">
						<strong>{$wordleStore.targetWord}</strong> - {$wordleStore.targetWordData.translation}
					</p>
				</div>
				<p class="text-text-secondary mb-6">{$wordleStore.targetWordData.definition}</p>
				<button
					on:click={shareResults}
					class="bg-success text-white px-6 py-3 rounded font-semibold hover:opacity-90 mr-2"
				>
					Share Results
				</button>
				<button
					on:click={() => showModal = false}
					class="bg-border px-6 py-3 rounded font-semibold hover:opacity-90"
				>
					Close
				</button>
			</div>
		</div>
	{/if}

	<Confetti trigger={triggerConfetti} />
</div>
