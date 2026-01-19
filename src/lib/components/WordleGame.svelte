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

	<div class="flex flex-col gap-1 mb-8">
		{#each $wordleStore.guesses as guess}
			<div class="flex gap-1 justify-center">
				{#each guess.result as letter}
					<div class="w-16 h-16 border-2 flex items-center justify-center text-3xl font-bold uppercase
						{letter.status === 'correct' ? 'bg-correct border-correct text-white' : ''}
						{letter.status === 'present' ? 'bg-present border-present text-white' : ''}
						{letter.status === 'absent' ? 'bg-absent border-absent text-white' : ''}">
						{letter.letter}
					</div>
				{/each}
			</div>
		{/each}

		{#if $wordleStore.gameState === 'playing'}
			<div class="flex gap-1 justify-center">
				{#each Array(5) as _, i}
					<div class="w-16 h-16 border-2 border-text-tertiary flex items-center justify-center text-3xl font-bold uppercase">
						{$wordleStore.currentGuess[i] || ''}
					</div>
				{/each}
			</div>
		{/if}

		{#each Array(emptyRows) as _}
			<div class="flex gap-1 justify-center">
				{#each Array(5) as _}
					<div class="w-16 h-16 border-2 border-border flex items-center justify-center"></div>
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
						class="min-w-11 h-14 rounded font-bold text-sm transition-colors
							{key.length > 1 ? 'min-w-16 text-xs' : ''}
							{$wordleStore.keyboardState[key] === 'correct' ? 'bg-correct text-white' : ''}
							{$wordleStore.keyboardState[key] === 'present' ? 'bg-present text-white' : ''}
							{$wordleStore.keyboardState[key] === 'absent' ? 'bg-absent text-white' : ''}
							{!$wordleStore.keyboardState[key] ? 'bg-border hover:opacity-80' : ''}"
					>
						{key}
					</button>
				{/each}
			</div>
		{/each}
	</div>

	{#if showModal}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" on:click={() => showModal = false}>
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
