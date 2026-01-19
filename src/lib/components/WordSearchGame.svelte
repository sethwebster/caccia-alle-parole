<script lang="ts">
	import { onMount } from 'svelte';
	import { wordSearchStore } from '$lib/stores/wordSearch';
	import { wordDatabase } from '$lib/data/word-data';
	import { generateGrid } from '$lib/utils/gridGenerator';
	import {
		getCellsBetween,
		getWordFromCells,
		checkIfWordFound,
		type SelectedCell
	} from '$lib/utils/wordDetection';
	import type { Difficulty } from '$lib/types';

	const categories = Object.keys(wordDatabase);
	const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

	let selectedCategory: string | null = $wordSearchStore.category;
	let selectedDifficulty: Difficulty | null = $wordSearchStore.difficulty;
	let isSelecting = false;
	let startCell: SelectedCell | null = null;
	let currentCell: SelectedCell | null = null;
	let selectedCells: SelectedCell[] = [];
	let showModal = false;

	$: isGameActive = $wordSearchStore.category && $wordSearchStore.difficulty;
	$: foundCount = $wordSearchStore.foundWords.size;
	$: totalWords = $wordSearchStore.words.length;
	$: isGameWon = isGameActive && foundCount === totalWords && totalWords > 0;

	$: if (isGameWon && !showModal) {
		setTimeout(() => {
			showModal = true;
		}, 500);
	}

	function startGame() {
		if (!selectedCategory || !selectedDifficulty) return;

		const categoryWords = wordDatabase[selectedCategory as keyof typeof wordDatabase];
		if (!categoryWords) return;

		const { grid, placedWords } = generateGrid(categoryWords, selectedDifficulty);

		wordSearchStore.setGame(selectedCategory, selectedDifficulty, placedWords, grid);
	}

	function handleMouseDown(row: number, col: number) {
		if (!isGameActive) return;

		isSelecting = true;
		startCell = { row, col, letter: $wordSearchStore.grid[row][col].letter };
		currentCell = startCell;
		selectedCells = [startCell];
	}

	function handleMouseEnter(row: number, col: number) {
		if (!isSelecting || !startCell || !isGameActive) return;

		currentCell = { row, col, letter: $wordSearchStore.grid[row][col].letter };
		selectedCells = getCellsBetween(
			startCell.row,
			startCell.col,
			currentCell.row,
			currentCell.col,
			$wordSearchStore.grid
		);
	}

	function handleMouseUp() {
		if (!isSelecting || selectedCells.length === 0) {
			isSelecting = false;
			startCell = null;
			currentCell = null;
			selectedCells = [];
			return;
		}

		const word = getWordFromCells(selectedCells);
		const foundWord = checkIfWordFound(word, $wordSearchStore.words);

		if (foundWord && !$wordSearchStore.foundWords.has(foundWord.word)) {
			wordSearchStore.markWordFound(foundWord.word);
		}

		isSelecting = false;
		startCell = null;
		currentCell = null;
		selectedCells = [];
	}

	function isCellSelected(row: number, col: number): boolean {
		return selectedCells.some(c => c.row === row && c.col === col);
	}

	function isCellInFoundWord(row: number, col: number): boolean {
		if (!isGameActive) return false;

		for (const foundWord of $wordSearchStore.foundWords) {
			const placedWord = $wordSearchStore.words.find(w => w.word === foundWord);
			if (!placedWord) continue;

			const word = placedWord.word.toUpperCase();
			let deltaRow = 0;
			let deltaCol = 0;

			switch (placedWord.direction) {
				case 'horizontal':
					deltaRow = 0;
					deltaCol = 1;
					break;
				case 'horizontal-reverse':
					deltaRow = 0;
					deltaCol = -1;
					break;
				case 'vertical':
					deltaRow = 1;
					deltaCol = 0;
					break;
				case 'vertical-reverse':
					deltaRow = -1;
					deltaCol = 0;
					break;
				case 'diagonal-down':
					deltaRow = 1;
					deltaCol = 1;
					break;
				case 'diagonal-down-reverse':
					deltaRow = -1;
					deltaCol = -1;
					break;
				case 'diagonal-up':
					deltaRow = -1;
					deltaCol = 1;
					break;
				case 'diagonal-up-reverse':
					deltaRow = 1;
					deltaCol = -1;
					break;
			}

			for (let i = 0; i < word.length; i++) {
				const wordRow = placedWord.row + i * deltaRow;
				const wordCol = placedWord.col + i * deltaCol;
				if (wordRow === row && wordCol === col) {
					return true;
				}
			}
		}

		return false;
	}

	function resetGame() {
		wordSearchStore.reset();
		selectedCategory = null;
		selectedDifficulty = null;
		showModal = false;
	}

	function newGame() {
		showModal = false;
		startGame();
	}

	onMount(() => {
		const handleGlobalMouseUp = () => {
			if (isSelecting) {
				handleMouseUp();
			}
		};

		window.addEventListener('mouseup', handleGlobalMouseUp);
		return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
	});
</script>

<div class="max-w-6xl mx-auto p-4">
	<header class="text-center mb-8">
		<h1 class="text-4xl font-bold mb-2">Caccia alle Parole</h1>
		<p class="text-text-secondary">Find hidden Italian words in the grid</p>
	</header>

	{#if !isGameActive}
		<div class="max-w-2xl mx-auto bg-surface rounded-lg p-8 border-2 border-border">
			<h2 class="text-2xl font-semibold mb-6">Start New Game</h2>

			<div class="mb-6">
				<label class="block text-sm font-semibold mb-2">Category</label>
				<select
					bind:value={selectedCategory}
					class="w-full p-3 bg-background border-2 border-border rounded text-base"
				>
					<option value={null}>Select a category</option>
					{#each categories as category}
						<option value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>
					{/each}
				</select>
			</div>

			<div class="mb-6">
				<label class="block text-sm font-semibold mb-2">Difficulty</label>
				<div class="grid grid-cols-3 gap-2">
					{#each difficulties as diff}
						<button
							on:click={() => (selectedDifficulty = diff)}
							class="p-3 rounded border-2 transition-colors font-semibold
								{selectedDifficulty === diff
									? 'bg-primary border-primary text-white'
									: 'bg-background border-border hover:border-primary'}"
						>
							{diff.charAt(0).toUpperCase() + diff.slice(1)}
						</button>
					{/each}
				</div>
				<p class="text-sm text-text-secondary mt-2">
					{#if selectedDifficulty === 'easy'}
						8x8 grid, 8 words
					{:else if selectedDifficulty === 'medium'}
						12x12 grid, 10 words
					{:else if selectedDifficulty === 'hard'}
						16x16 grid, 12 words
					{/if}
				</p>
			</div>

			<button
				on:click={startGame}
				disabled={!selectedCategory || !selectedDifficulty}
				class="w-full bg-success text-white py-3 rounded font-semibold text-lg
					disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
			>
				Start Game
			</button>
		</div>
	{:else}
		<div class="mb-4 flex justify-between items-center">
			<div class="text-lg">
				<span class="font-semibold">Words:</span>
				<span class="text-success">{foundCount}</span> / {totalWords}
			</div>
			<div class="text-lg">
				<span class="font-semibold">Score:</span>
				<span class="text-primary">{$wordSearchStore.score}</span>
			</div>
			<button
				on:click={resetGame}
				class="bg-border px-4 py-2 rounded font-semibold hover:opacity-80"
			>
				New Game
			</button>
		</div>

		<div class="grid lg:grid-cols-[1fr_300px] gap-6">
			<div class="flex justify-center">
				<div
					class="inline-grid gap-1 select-none"
					style="grid-template-columns: repeat({$wordSearchStore.grid.length}, minmax(0, 1fr));"
				>
					{#each $wordSearchStore.grid as row, rowIndex}
						{#each row as cell, colIndex}
							<div
								on:mousedown={() => handleMouseDown(rowIndex, colIndex)}
								on:mouseenter={() => handleMouseEnter(rowIndex, colIndex)}
								class="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center border border-border
									font-bold text-sm md:text-base cursor-pointer transition-colors
									{isCellInFoundWord(rowIndex, colIndex)
										? 'bg-success/20 text-success border-success'
										: isCellSelected(rowIndex, colIndex)
											? 'bg-primary/20 text-primary border-primary'
											: 'bg-surface hover:bg-background'}"
							>
								{cell.letter}
							</div>
						{/each}
					{/each}
				</div>
			</div>

			<div class="bg-surface rounded-lg p-4 border-2 border-border h-fit">
				<h3 class="font-semibold mb-4 text-lg">Words to Find</h3>
				<div class="space-y-2">
					{#each $wordSearchStore.words as word}
						<div
							class="p-2 rounded border transition-all
								{$wordSearchStore.foundWords.has(word.word)
									? 'bg-success/10 border-success line-through text-text-secondary'
									: 'border-border'}"
						>
							<div class="font-semibold">{word.word}</div>
							<div class="text-sm text-text-secondary">{word.translation}</div>
							{#if $wordSearchStore.foundWords.has(word.word)}
								<div class="text-xs text-success mt-1">+{word.points} points</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	{#if showModal && isGameWon}
		<div
			class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
			on:click={() => (showModal = false)}
		>
			<div class="bg-surface rounded-lg p-8 max-w-md text-center" on:click|stopPropagation>
				<h2 class="text-3xl font-bold mb-4">Complimenti!</h2>
				<p class="text-xl mb-2">You found all {totalWords} words!</p>
				<p class="text-2xl font-bold text-primary mb-6">
					Final Score: {$wordSearchStore.score}
				</p>
				<div class="flex gap-2 justify-center">
					<button
						on:click={newGame}
						class="bg-success text-white px-6 py-3 rounded font-semibold hover:opacity-90"
					>
						Play Again
					</button>
					<button
						on:click={resetGame}
						class="bg-border px-6 py-3 rounded font-semibold hover:opacity-90"
					>
						New Category
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
