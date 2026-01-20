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
	let gridElement: HTMLElement;

	$: isGameActive = $wordSearchStore.category && $wordSearchStore.difficulty;
	$: foundCount = $wordSearchStore.foundWords.size;
	$: totalWords = $wordSearchStore.words.length;
	$: isGameWon = isGameActive && foundCount === totalWords && totalWords > 0;
	$: gridSize = $wordSearchStore.grid.length;

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

	function handlePointerDown(row: number, col: number, e: PointerEvent) {
		if (!isGameActive) return;
		e.preventDefault();

		isSelecting = true;
		startCell = { row, col, letter: $wordSearchStore.grid[row][col].letter };
		currentCell = startCell;
		selectedCells = [startCell];
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isSelecting || !startCell || !isGameActive || !gridElement) return;

		const rect = gridElement.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const cellSize = rect.width / gridSize;
		const col = Math.floor(x / cellSize);
		const row = Math.floor(y / cellSize);

		if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
			if (!currentCell || currentCell.row !== row || currentCell.col !== col) {
				currentCell = { row, col, letter: $wordSearchStore.grid[row][col].letter };
				selectedCells = getCellsBetween(
					startCell.row,
					startCell.col,
					currentCell.row,
					currentCell.col,
					$wordSearchStore.grid
				);
			}
		}
	}

	function handlePointerUp() {
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
		return selectedCells.some((c) => c.row === row && c.col === col);
	}

	function isCellInFoundWord(row: number, col: number): boolean {
		if (!isGameActive) return false;

		for (const foundWord of $wordSearchStore.foundWords) {
			const placedWord = $wordSearchStore.words.find((w) => w.word === foundWord);
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
		const handleGlobalPointerUp = () => {
			if (isSelecting) {
				handlePointerUp();
			}
		};

		window.addEventListener('pointerup', handleGlobalPointerUp);
		return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
	});
</script>

<div class="cds-container">
	<header class="header">
		<h1 class="cds-heading-1 cds-text-center">Caccia alle Parole</h1>
		<p class="cds-text-lg cds-text-center cds-text-secondary">
			Trova tutte le parole nascoste nella griglia
		</p>
	</header>

	{#if !isGameActive}
		<div class="controls cds-card">
			<h2 class="cds-heading-3 cds-mb-4">Nuova Partita</h2>

			<div class="control-group">
				<label class="control-label">Categoria</label>
				<select bind:value={selectedCategory} class="category-select">
					<option value={null}>Seleziona categoria...</option>
					{#each categories as category}
						<option value={category}
							>{category.charAt(0).toUpperCase() + category.slice(1)}</option
						>
					{/each}
				</select>
			</div>

			<div class="control-group">
				<label class="control-label">Difficoltà</label>
				<div class="difficulty-buttons">
					{#each difficulties as diff}
						<button
							onclick={() => (selectedDifficulty = diff)}
							class="difficulty-btn"
							class:active={selectedDifficulty === diff}
						>
							{diff === 'easy' ? 'Facile' : diff === 'medium' ? 'Medio' : 'Difficile'}
						</button>
					{/each}
				</div>
				<p class="cds-text-sm cds-text-secondary cds-mt-2">
					{#if selectedDifficulty === 'easy'}
						Griglia 8x8, 8 parole
					{:else if selectedDifficulty === 'medium'}
						Griglia 12x12, 10 parole
					{:else if selectedDifficulty === 'hard'}
						Griglia 16x16, 12 parole
					{/if}
				</p>
			</div>

			<button
				onclick={startGame}
				disabled={!selectedCategory || !selectedDifficulty}
				class="cds-button cds-button--primary cds-w-full"
			>
				Nuova Partita
			</button>
		</div>
	{:else}
		<div class="game-stats">
			<div class="stat">
				<span class="stat-label">Trovate</span>
				<span class="stat-value">{foundCount}/{totalWords}</span>
			</div>
			<div class="stat">
				<span class="stat-label">Punteggio</span>
				<span class="stat-value">{$wordSearchStore.score}</span>
			</div>
			<button onclick={resetGame} class="cds-button cds-button--outline"> Nuova Partita </button>
		</div>

		<div class="game-container">
			<div class="grid-container">
				<div
					bind:this={gridElement}
					class="word-grid"
					style="grid-template-columns: repeat({gridSize}, 1fr);"
					onpointermove={handlePointerMove}
				>
					{#each $wordSearchStore.grid as row, rowIndex}
						{#each row as cell, colIndex}
							<div
								onpointerdown={(e) => handlePointerDown(rowIndex, colIndex, e)}
								class="grid-cell"
								class:selected={isCellSelected(rowIndex, colIndex)}
								class:found={isCellInFoundWord(rowIndex, colIndex)}
							>
								{cell.letter}
							</div>
						{/each}
					{/each}
				</div>
			</div>

			<div class="word-list-container cds-card">
				<h3 class="cds-heading-4 cds-text-center cds-mb-3">Parole da Trovare</h3>
				<ul class="word-list">
					{#each $wordSearchStore.words as word}
						<li class="word-item" class:found={$wordSearchStore.foundWords.has(word.word)}>
							<span class="word-text">{word.word}</span>
							<span class="word-translation">{word.translation}</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}

	{#if showModal && isGameWon}
		<div class="cds-modal" onclick={() => (showModal = false)}>
			<div class="cds-modal__backdrop"></div>
			<div class="cds-modal__content" onclick={(e) => e.stopPropagation()}>
				<div class="cds-modal__header">
					<h2 class="cds-modal__title">Complimenti!</h2>
				</div>
				<div class="cds-modal__body cds-text-center">
					<p class="cds-text-lg">Hai trovato tutte le {totalWords} parole!</p>
					<div class="cds-mt-4">
						<p class="cds-text-base">
							<strong>Punteggio Finale:</strong>
							<span class="cds-text-primary-color cds-font-bold">{$wordSearchStore.score}</span>
						</p>
					</div>
				</div>
				<div class="cds-modal__footer">
					<button onclick={newGame} class="cds-button cds-button--primary"> Gioca Ancora </button>
					<button onclick={resetGame} class="cds-button cds-button--outline">
						Nuova Categoria
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.header {
		text-align: center;
		margin-bottom: 32px;
		padding: 24px 0;
	}

	/* Controls */
	.controls {
		max-width: 500px;
		margin: 0 auto;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.control-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--cds-color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.category-select {
		width: 100%;
		padding: 12px 16px;
		border-radius: var(--cds-radius-md);
		border: 2px solid var(--cds-color-border);
		background: var(--cds-color-background);
		font-family: inherit;
		font-size: 1rem;
		color: var(--cds-color-text-primary);
		font-weight: 500;
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
		background-repeat: no-repeat;
		background-position: right 16px center;
		background-size: 16px;
	}

	.difficulty-buttons {
		display: flex;
		gap: 8px;
		background: var(--cds-color-background);
		padding: 4px;
		border-radius: var(--cds-radius-md);
	}

	.difficulty-btn {
		flex: 1;
		padding: 10px;
		border: none;
		background: transparent;
		border-radius: var(--cds-radius-sm);
		font-family: inherit;
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--cds-color-text-secondary);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.difficulty-btn.active {
		background: var(--cds-color-surface);
		color: var(--cds-color-text-primary);
		box-shadow: var(--cds-shadow-sm);
	}

	/* Stats */
	.game-stats {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--cds-space-4);
		margin-bottom: var(--cds-space-4);
	}

	.stat {
		display: flex;
		flex-direction: column;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--cds-color-text-secondary);
		font-weight: 600;
		text-transform: uppercase;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--cds-color-text-primary);
	}

	/* Game Container */
	.game-container {
		display: flex;
		flex-direction: column;
		gap: 24px;
		align-items: center;
		padding: var(--cds-space-4) 0;
	}

	.grid-container {
		width: 100%;
		max-width: 500px;
		aspect-ratio: 1 / 1;
		background: var(--cds-color-surface);
		padding: 16px;
		border-radius: var(--cds-radius-lg);
		box-shadow: var(--cds-shadow-card);
		box-sizing: border-box;
		overflow: hidden;
		position: relative;
	}

	.word-grid {
		display: grid;
		position: absolute;
		inset: 16px;
		gap: 2px;
		user-select: none;
		touch-action: none;
		box-sizing: border-box;
	}

	.grid-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: clamp(10px, 2vw, 16px);
		line-height: 1;
		color: var(--cds-color-text-primary);
		border-radius: 3px;
		background: var(--cds-color-background);
		cursor: pointer;
		transition: background 0.2s, transform 0.1s;
		aspect-ratio: 1 / 1;
		min-width: 0;
		min-height: 0;
		box-sizing: border-box;
	}

	.grid-cell.selected {
		background: var(--cds-color-accent);
		color: var(--cds-color-dark);
		transform: scale(0.95);
	}

	.grid-cell.found {
		background: var(--cds-color-secondary);
		color: white;
		animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	@keyframes popIn {
		0% {
			transform: scale(0.5);
			opacity: 0;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	/* Word List */
	.word-list-container {
		width: 100%;
		max-width: 500px;
		padding: 16px;
	}

	.word-list {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		padding: 0;
		margin: 0;
	}

	.word-item {
		background: var(--cds-color-background);
		padding: 8px 14px;
		border-radius: 20px;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--cds-color-text-primary);
		cursor: default;
		transition: all 0.2s;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.word-item.found {
		background: var(--cds-color-secondary);
		color: white;
		text-decoration: line-through;
		opacity: 0.7;
	}

	.word-translation {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	/* Mobile */
	@media (max-width: 640px) {
		.grid-container {
			max-width: 100%;
			padding: 12px;
		}

		.word-grid {
			inset: 12px;
			gap: 1px;
		}

		.grid-cell {
			font-size: clamp(8px, 1.8vw, 12px);
			border-radius: 2px;
		}

		.game-container {
			gap: 16px;
			padding: var(--cds-space-2) 0;
		}

		.game-stats {
			flex-wrap: wrap;
			gap: 12px;
		}

		.header {
			padding: 16px 0;
			margin-bottom: 24px;
		}
	}

	/* Desktop layout */
	@media (min-width: 769px) {
		.game-container {
			display: grid;
			grid-template-columns: 1fr 280px;
			align-items: start;
			max-width: 900px;
			margin: 0 auto;
		}

		.grid-container {
			max-width: 100%;
		}

		.word-list-container {
			max-width: none;
		}
	}
</style>
