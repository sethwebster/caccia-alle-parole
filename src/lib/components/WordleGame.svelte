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

<div class="wordle-game">
	<header>
		<h1>Paròla</h1>
		<p class="puzzle-number">Puzzle #{getPuzzleNumber()}</p>
	</header>

	<div class="grid">
		{#each $wordleStore.guesses as guess}
			<div class="row">
				{#each guess.result as letter}
					<div class="cell {letter.status}">{letter.letter}</div>
				{/each}
			</div>
		{/each}

		{#if $wordleStore.gameState === 'playing'}
			<div class="row">
				{#each Array(5) as _, i}
					<div class="cell current">{$wordleStore.currentGuess[i] || ''}</div>
				{/each}
			</div>
		{/if}

		{#each Array(emptyRows) as _}
			<div class="row">
				{#each Array(5) as _}
					<div class="cell empty"></div>
				{/each}
			</div>
		{/each}
	</div>

	<div class="keyboard">
		{#each KEYBOARD_ROWS as row}
			<div class="keyboard-row">
				{#each row as key}
					<button
						class="key {key.length > 1 ? 'wide' : ''} {$wordleStore.keyboardState[key] || ''}"
						on:click={() => handleKeyClick(key)}
					>
						{key}
					</button>
				{/each}
			</div>
		{/each}
	</div>

	{#if showModal}
		<div class="modal-backdrop" on:click={() => showModal = false}>
			<div class="modal" on:click|stopPropagation>
				<h2>{$wordleStore.gameState === 'won' ? 'Complimenti!' : 'Prossima volta!'}</h2>
				<p class="word-reveal">
					<strong>{$wordleStore.targetWord}</strong> - {$wordleStore.targetWordData.translation}
				</p>
				<p class="definition">{$wordleStore.targetWordData.definition}</p>
				<button class="share-btn" on:click={shareResults}>Share Results</button>
				<button class="close-btn" on:click={() => showModal = false}>Close</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.wordle-game {
		max-width: 500px;
		margin: 0 auto;
		padding: 1rem;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0;
	}

	.puzzle-number {
		color: #666;
		font-size: 0.9rem;
	}

	.grid {
		display: flex;
		flex-direction: column;
		gap: 5px;
		margin-bottom: 2rem;
	}

	.row {
		display: flex;
		gap: 5px;
		justify-content: center;
	}

	.cell {
		width: 62px;
		height: 62px;
		border: 2px solid #d3d6da;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.cell.current {
		border-color: #878a8c;
	}

	.cell.correct {
		background: #6aaa64;
		border-color: #6aaa64;
		color: white;
	}

	.cell.present {
		background: #c9b458;
		border-color: #c9b458;
		color: white;
	}

	.cell.absent {
		background: #787c7e;
		border-color: #787c7e;
		color: white;
	}

	.keyboard {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.keyboard-row {
		display: flex;
		gap: 6px;
		justify-content: center;
	}

	.key {
		min-width: 43px;
		height: 58px;
		border: none;
		border-radius: 4px;
		background: #d3d6da;
		font-weight: 700;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.key.wide {
		min-width: 65px;
		font-size: 0.7rem;
	}

	.key:hover {
		opacity: 0.8;
	}

	.key.correct {
		background: #6aaa64;
		color: white;
	}

	.key.present {
		background: #c9b458;
		color: white;
	}

	.key.absent {
		background: #787c7e;
		color: white;
	}

	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		max-width: 400px;
		text-align: center;
	}

	.modal h2 {
		margin-top: 0;
	}

	.word-reveal {
		font-size: 1.5rem;
		margin: 1rem 0;
	}

	.definition {
		color: #666;
		margin-bottom: 1.5rem;
	}

	.share-btn, .close-btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-weight: 600;
		cursor: pointer;
		margin: 0.25rem;
	}

	.share-btn {
		background: #6aaa64;
		color: white;
	}

	.close-btn {
		background: #d3d6da;
	}

	@media (max-width: 640px) {
		.cell {
			width: 52px;
			height: 52px;
			font-size: 1.5rem;
		}

		.key {
			min-width: 36px;
			height: 48px;
		}

		.key.wide {
			min-width: 55px;
		}
	}
</style>
