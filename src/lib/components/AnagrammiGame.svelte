<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { anagrammiStore } from '$lib/stores/anagrammi';

	let showModal = false;

	$: if ($anagrammiStore.gameState !== 'playing' && !showModal) {
		setTimeout(() => { showModal = true; }, 500);
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function handleLetterClick(letter: string) {
		anagrammiStore.addLetter(letter);
	}

	function handleKeyPress(e: KeyboardEvent) {
		if ($anagrammiStore.gameState !== 'playing') return;

		if (e.key === 'Enter') {
			anagrammiStore.submitGuess();
		} else if (e.key === 'Backspace') {
			anagrammiStore.removeLetter();
		} else if (/^[a-zA-Z]$/.test(e.key)) {
			anagrammiStore.addLetter(e.key.toUpperCase());
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeyPress);
		return () => window.removeEventListener('keydown', handleKeyPress);
	});

	onDestroy(() => {
		// Cleanup handled in store
	});
</script>

<div class="max-w-2xl mx-auto p-4">
	<header class="text-center mb-6">
		<h1 class="text-4xl font-bold mb-2">Anagrammi</h1>
		<p class="text-text-secondary">Riordina le lettere per formare la parola!</p>
	</header>

	<div class="flex justify-between items-center mb-6 bg-surface rounded-lg p-4">
		<div class="text-center flex-1">
			<div class="text-sm text-text-secondary">Tempo</div>
			<div class="text-2xl font-bold" class:text-error={$anagrammiStore.timeLeft < 15}>
				{formatTime($anagrammiStore.timeLeft)}
			</div>
		</div>
		<div class="text-center flex-1">
			<div class="text-sm text-text-secondary">Punteggio</div>
			<div class="text-2xl font-bold text-success">{$anagrammiStore.score}</div>
		</div>
		<div class="text-center flex-1">
			<div class="text-sm text-text-secondary">Serie</div>
			<div class="text-2xl font-bold text-primary">{$anagrammiStore.streak}</div>
		</div>
	</div>

	<div class="bg-surface rounded-lg p-6 mb-4">
		<div class="text-center mb-2">
			<div class="text-sm text-text-secondary mb-1">Categoria</div>
			<div class="text-lg font-semibold capitalize">{$anagrammiStore.category}</div>
		</div>
	</div>

	<div class="mb-6">
		<div class="text-center mb-4">
			<div class="text-sm text-text-secondary mb-2">Lettere Mescolate</div>
			<div class="flex justify-center gap-2 flex-wrap">
				{#each $anagrammiStore.scrambledWord.split('') as letter}
					<button
						on:click={() => handleLetterClick(letter)}
						class="w-14 h-14 bg-primary text-white rounded-lg text-2xl font-bold hover:opacity-90 transition-opacity"
						disabled={$anagrammiStore.gameState !== 'playing'}
					>
						{letter}
					</button>
				{/each}
			</div>
		</div>

		<div class="bg-surface rounded-lg p-6 mb-4">
			<div class="text-center mb-2">
				<div class="text-sm text-text-secondary mb-2">La Tua Risposta</div>
				<div class="flex justify-center gap-2 flex-wrap min-h-[3.5rem]">
					{#each Array($anagrammiStore.targetWord.length) as _, i}
						<div class="w-14 h-14 border-2 border-border rounded-lg flex items-center justify-center text-2xl font-bold"
							class:border-primary={i < $anagrammiStore.currentGuess.length}
							class:bg-primary={i < $anagrammiStore.currentGuess.length}
							class:text-white={i < $anagrammiStore.currentGuess.length}
						>
							{$anagrammiStore.currentGuess[i] || ''}
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="flex gap-2 justify-center flex-wrap">
			<button
				on:click={() => anagrammiStore.useHint()}
				disabled={$anagrammiStore.hintsUsed >= 2 || $anagrammiStore.gameState !== 'playing'}
				class="bg-warning text-white px-4 py-2 rounded font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
			>
				💡 Aiuto ({2 - $anagrammiStore.hintsUsed} rimasti)
			</button>
			<button
				on:click={() => anagrammiStore.removeLetter()}
				disabled={$anagrammiStore.currentGuess.length === 0 || $anagrammiStore.gameState !== 'playing'}
				class="bg-border px-4 py-2 rounded font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
			>
				⌫ Cancella
			</button>
			<button
				on:click={() => anagrammiStore.submitGuess()}
				disabled={$anagrammiStore.currentGuess.length !== $anagrammiStore.targetWord.length || $anagrammiStore.gameState !== 'playing'}
				class="bg-success text-white px-6 py-2 rounded font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
			>
				✓ Invia
			</button>
			<button
				on:click={() => anagrammiStore.skipWord()}
				disabled={$anagrammiStore.gameState !== 'playing'}
				class="bg-error text-white px-4 py-2 rounded font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
			>
				⏭ Salta
			</button>
		</div>
	</div>
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
			<h2 class="text-3xl font-bold mb-4">
				{$anagrammiStore.gameState === 'correct' ? '🎉 Esatto!' : '⏰ Tempo Scaduto!'}
			</h2>
			<div class="mb-4">
				<div class="text-2xl font-bold mb-2">{$anagrammiStore.targetWord}</div>
				<div class="text-lg text-text-secondary mb-1">{$anagrammiStore.translation}</div>
				<div class="text-sm text-text-secondary">{$anagrammiStore.definition}</div>
			</div>
			<div class="grid grid-cols-2 gap-4 mb-6">
				<div>
					<div class="text-text-secondary text-sm">Punteggio</div>
					<div class="text-2xl font-bold text-success">{$anagrammiStore.score}</div>
				</div>
				<div>
					<div class="text-text-secondary text-sm">Serie</div>
					<div class="text-2xl font-bold text-primary">{$anagrammiStore.streak}</div>
				</div>
			</div>
			<div class="flex gap-2 justify-center">
				<button
					on:click={() => { showModal = false; anagrammiStore.nextWord(); }}
					class="bg-success text-white px-6 py-3 rounded font-semibold hover:opacity-90"
				>
					Prossima Parola
				</button>
				<button
					on:click={() => { showModal = false; anagrammiStore.reset(); }}
					class="bg-border px-6 py-3 rounded font-semibold hover:opacity-90"
				>
					Ricomincia
				</button>
			</div>
		</div>
	</div>
{/if}
