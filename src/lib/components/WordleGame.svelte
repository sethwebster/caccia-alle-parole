<script lang="ts">
	import { onMount } from 'svelte';
	import { wordleStore } from '$lib/stores/wordle';

	const KEYBOARD_ROWS = [
		['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
		['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
		['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
	];

	let showModal = false;

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

<div class="max-w-lg mx-auto p-4">
	<header class="text-center mb-8">
		<h1 class="text-4xl font-bold">Paròla</h1>
		<p class="text-text-secondary text-sm">Puzzle #{getPuzzleNumber()}</p>
	</header>

	<div class="flex flex-col gap-1.5 mb-8">
		{#each $wordleStore.guesses as guess}
			<div class="flex gap-1.5 justify-center">
				{#each guess.result as letter}
					<div class="tile tile-revealed w-16 h-16 flex items-center justify-center text-2xl font-bold uppercase
						{letter.status === 'correct' ? 'tile-correct' : ''}
						{letter.status === 'present' ? 'tile-present' : ''}
						{letter.status === 'absent' ? 'tile-absent' : ''}">
						{letter.letter}
					</div>
				{/each}
			</div>
		{/each}

		{#if $wordleStore.gameState === 'playing'}
			<div class="flex gap-1.5 justify-center">
				{#each Array(5) as _, i}
					<div class="tile w-16 h-16 flex items-center justify-center text-2xl font-bold uppercase
						{$wordleStore.currentGuess[i] ? 'tile-filled' : ''}">
						{$wordleStore.currentGuess[i] || ''}
					</div>
				{/each}
			</div>
		{/if}

		{#each Array(emptyRows) as _}
			<div class="flex gap-1.5 justify-center">
				{#each Array(5) as _}
					<div class="tile w-16 h-16 flex items-center justify-center"></div>
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
						class="keyboard-key min-w-11 h-14 font-bold text-sm
							{key.length > 1 ? 'min-w-16 text-xs' : ''}
							{$wordleStore.keyboardState[key] === 'correct' ? 'key-correct' : ''}
							{$wordleStore.keyboardState[key] === 'present' ? 'key-present' : ''}
							{$wordleStore.keyboardState[key] === 'absent' ? 'key-absent' : ''}
							{!$wordleStore.keyboardState[key] ? 'key-default' : ''}"
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
				<h2 class="text-2xl font-bold mb-4">
					{$wordleStore.gameState === 'won' ? 'Complimenti!' : 'Prossima volta!'}
				</h2>
				<p class="text-2xl mb-2">
					<strong>{$wordleStore.targetWord}</strong> - {$wordleStore.targetWordData.translation}
				</p>
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
</div>

<style>
	/* Tile Styles - Wordle-inspired */
	.tile {
		border: 2px solid var(--tile-border, #d3d6da);
		border-radius: 4px;
		transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.1s ease;
		background-color: var(--tile-bg, white);
		color: var(--tile-text, #1a1a1b);
	}

	.tile-filled {
		border-color: var(--tile-filled-border, #878a8c);
		animation: pop 0.1s ease-in-out;
	}

	.tile-revealed {
		animation: flip 0.5s ease-in-out;
	}

	.tile-correct {
		background-color: var(--tile-correct, #6aaa64);
		border-color: var(--tile-correct, #6aaa64);
		color: white;
	}

	.tile-present {
		background-color: var(--tile-present, #c9b458);
		border-color: var(--tile-present, #c9b458);
		color: white;
	}

	.tile-absent {
		background-color: var(--tile-absent, #787c7e);
		border-color: var(--tile-absent, #787c7e);
		color: white;
	}

	/* Keyboard Styles - Wordle-inspired */
	.keyboard-key {
		border-radius: 4px;
		transition: background-color 0.15s ease, transform 0.15s ease;
		border: none;
		cursor: pointer;
		font-family: inherit;
	}

	.key-default {
		background-color: var(--key-default, #d3d6da);
		color: var(--key-text, #1a1a1b);
	}

	.key-default:hover {
		background-color: var(--key-default-hover, #c3c6ca);
	}

	.key-default:active {
		transform: scale(0.95);
	}

	.key-correct {
		background-color: var(--tile-correct, #6aaa64);
		color: white;
	}

	.key-present {
		background-color: var(--tile-present, #c9b458);
		color: white;
	}

	.key-absent {
		background-color: var(--tile-absent, #787c7e);
		color: white;
	}

	/* Animations */
	@keyframes pop {
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

	@keyframes flip {
		0% {
			transform: rotateX(0);
		}
		50% {
			transform: rotateX(-90deg);
		}
		100% {
			transform: rotateX(0);
		}
	}
</style>
