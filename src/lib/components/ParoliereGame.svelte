<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { paroliereStore, type Cell } from '$lib/stores/paroliere';
	import { validWords } from '$lib/data/wordle-valid-words';

	let showModal = false;
	let isDragging = false;

	$: if ($paroliereStore.gameState === 'finished' && !showModal) {
		setTimeout(() => { showModal = true; }, 500);
	}

	function isValidWord(word: string): boolean {
		return validWords.has(word.toUpperCase());
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function handleCellClick(row: number, col: number) {
		paroliereStore.selectCell({ letter: $paroliereStore.grid[row][col], row, col });
	}

	function handleMouseDown(row: number, col: number) {
		isDragging = true;
		paroliereStore.clearSelection();
		paroliereStore.selectCell({ letter: $paroliereStore.grid[row][col], row, col });
	}

	function handleMouseEnter(row: number, col: number) {
		if (isDragging) {
			paroliereStore.selectCell({ letter: $paroliereStore.grid[row][col], row, col });
		}
	}

	function handleMouseUp() {
		if (isDragging) {
			isDragging = false;
			if ($paroliereStore.currentWord.length >= 3) {
				paroliereStore.submitWord(isValidWord);
			} else {
				paroliereStore.clearSelection();
			}
		}
	}

	function isCellSelected(row: number, col: number): boolean {
		return $paroliereStore.currentPath.some(c => c.row === row && c.col === col);
	}

	onMount(() => {
		window.addEventListener('mouseup', handleMouseUp);
		return () => {
			window.removeEventListener('mouseup', handleMouseUp);
		};
	});

	onDestroy(() => {
		paroliereStore.endGame();
	});
</script>

<div class="max-w-2xl mx-auto p-4">
	<header class="text-center mb-6">
		<h1 class="text-4xl font-bold mb-2">Paroliere</h1>
		<p class="text-text-secondary">Trova più parole possibili in 3 minuti!</p>
	</header>

	{#if $paroliereStore.gameState === 'setup'}
		<div class="text-center">
			<div class="bg-surface rounded-lg p-8 mb-4">
				<h2 class="text-2xl font-bold mb-4">Come si gioca</h2>
				<ul class="text-left space-y-2 max-w-md mx-auto">
					<li>✓ Trascina il mouse tra lettere adiacenti</li>
					<li>✓ Le parole devono essere lunghe almeno 3 lettere</li>
					<li>✓ Più lunga è la parola, più punti ottieni</li>
					<li>✓ Hai 3 minuti per trovare più parole possibili</li>
				</ul>
			</div>
			<button
				on:click={() => paroliereStore.startGame()}
				class="bg-success text-white px-8 py-4 rounded-lg text-xl font-semibold hover:opacity-90 transition-opacity"
			>
				Inizia Partita
			</button>
		</div>
	{:else}
		<div class="flex justify-between items-center mb-6 bg-surface rounded-lg p-4">
			<div class="text-center flex-1">
				<div class="text-sm text-text-secondary">Tempo</div>
				<div class="text-2xl font-bold" class:text-error={$paroliereStore.timeLeft < 30}>
					{formatTime($paroliereStore.timeLeft)}
				</div>
			</div>
			<div class="text-center flex-1">
				<div class="text-sm text-text-secondary">Punteggio</div>
				<div class="text-2xl font-bold text-success">{$paroliereStore.score}</div>
			</div>
			<div class="text-center flex-1">
				<div class="text-sm text-text-secondary">Parole</div>
				<div class="text-2xl font-bold">{$paroliereStore.foundWords.size}</div>
			</div>
		</div>

		<div class="mb-6">
			<div class="bg-surface rounded-lg p-4 mb-4">
				<div class="text-center text-2xl font-bold h-8 tracking-wide">
					{$paroliereStore.currentWord || ' '}
				</div>
			</div>

			<div class="grid grid-cols-4 gap-2 max-w-md mx-auto select-none">
				{#each $paroliereStore.grid as row, i}
					{#each row as letter, j}
						<button
							on:mousedown={() => handleMouseDown(i, j)}
							on:mouseenter={() => handleMouseEnter(i, j)}
							class="aspect-square bg-surface rounded-lg flex items-center justify-center text-3xl font-bold transition-all border-2
								{isCellSelected(i, j) ? 'bg-primary text-white border-primary scale-105' : 'border-border hover:border-primary'}"
							class:cursor-grabbing={isDragging}
						>
							{letter}
						</button>
					{/each}
				{/each}
			</div>
		</div>

		{#if $paroliereStore.foundWords.size > 0}
			<div class="bg-surface rounded-lg p-4">
				<h3 class="font-bold mb-2">Parole Trovate ({$paroliereStore.foundWords.size})</h3>
				<div class="flex flex-wrap gap-2">
					{#each Array.from($paroliereStore.foundWords).sort() as word}
						<span class="bg-success/10 text-success px-3 py-1 rounded-full text-sm font-medium uppercase">
							{word}
						</span>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
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
			<h2 class="text-3xl font-bold mb-4">Partita Finita!</h2>
			<div class="space-y-4 mb-6">
				<div>
					<div class="text-text-secondary">Punteggio Finale</div>
					<div class="text-4xl font-bold text-success">{$paroliereStore.score}</div>
				</div>
				<div>
					<div class="text-text-secondary">Parole Trovate</div>
					<div class="text-2xl font-bold">{$paroliereStore.foundWords.size}</div>
				</div>
			</div>
			<div class="flex gap-2 justify-center">
				<button
					on:click={() => { showModal = false; paroliereStore.startGame(); }}
					class="bg-success text-white px-6 py-3 rounded font-semibold hover:opacity-90"
				>
					Gioca Ancora
				</button>
				<button
					on:click={() => showModal = false}
					class="bg-border px-6 py-3 rounded font-semibold hover:opacity-90"
				>
					Chiudi
				</button>
			</div>
		</div>
	</div>
{/if}
