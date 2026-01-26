<script lang="ts">
	import { onMount } from 'svelte';
	import { impiccatoStore } from '$lib/stores/impiccato';

	const KEYBOARD_LAYOUT = [
		['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
		['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
		['Z', 'X', 'C', 'V', 'B', 'N', 'M']
	];

	let showModal = false;

	$: if ($impiccatoStore.gameState !== 'playing' && !showModal) {
		setTimeout(() => { showModal = true; }, 500);
	}

	function getDisplayWord(): string[] {
		return $impiccatoStore.targetWord.split('').map(letter => {
			if (letter === ' ') return ' ';
			if (letter === '-') return '-';
			if (letter === "'") return "'";
			return $impiccatoStore.guessedLetters.has(letter) ? letter : '_';
		});
	}

	function isLetterGuessed(letter: string): boolean {
		return $impiccatoStore.guessedLetters.has(letter);
	}

	function isLetterCorrect(letter: string): boolean {
		return $impiccatoStore.targetWord.includes(letter) && isLetterGuessed(letter);
	}

	function isLetterWrong(letter: string): boolean {
		return !$impiccatoStore.targetWord.includes(letter) && isLetterGuessed(letter);
	}

	function handleKeyClick(letter: string) {
		if ($impiccatoStore.gameState === 'playing') {
			impiccatoStore.guessLetter(letter);
		}
	}

	function drawHangman(canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const lives = $impiccatoStore.remainingLives;
		const mistakes = 6 - lives;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.strokeStyle = '#333';
		ctx.lineWidth = 3;
		ctx.lineCap = 'round';

		// Base
		if (mistakes >= 1) {
			ctx.beginPath();
			ctx.moveTo(20, 280);
			ctx.lineTo(180, 280);
			ctx.stroke();
		}

		// Pole
		if (mistakes >= 2) {
			ctx.beginPath();
			ctx.moveTo(60, 280);
			ctx.lineTo(60, 40);
			ctx.stroke();
		}

		// Top beam
		if (mistakes >= 3) {
			ctx.beginPath();
			ctx.moveTo(60, 40);
			ctx.lineTo(140, 40);
			ctx.stroke();
		}

		// Rope
		if (mistakes >= 4) {
			ctx.beginPath();
			ctx.moveTo(140, 40);
			ctx.lineTo(140, 70);
			ctx.stroke();
		}

		// Head
		if (mistakes >= 5) {
			ctx.beginPath();
			ctx.arc(140, 90, 20, 0, Math.PI * 2);
			ctx.stroke();
		}

		// Body
		if (mistakes >= 6) {
			ctx.beginPath();
			ctx.moveTo(140, 110);
			ctx.lineTo(140, 180);
			ctx.stroke();

			// Arms
			ctx.beginPath();
			ctx.moveTo(140, 130);
			ctx.lineTo(110, 150);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(140, 130);
			ctx.lineTo(170, 150);
			ctx.stroke();

			// Legs
			ctx.beginPath();
			ctx.moveTo(140, 180);
			ctx.lineTo(110, 230);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(140, 180);
			ctx.lineTo(170, 230);
			ctx.stroke();
		}
	}

	let canvas: HTMLCanvasElement;

	$: if (canvas) {
		drawHangman(canvas);
	}

	onMount(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if ($impiccatoStore.gameState !== 'playing') return;
			if (/^[a-zA-Z]$/.test(e.key)) {
				impiccatoStore.guessLetter(e.key.toUpperCase());
			}
		};

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="max-w-3xl mx-auto p-4">
	<header class="text-center mb-6">
		<h1 class="text-4xl font-bold mb-2">Impiccato</h1>
		<p class="text-text-secondary">Indovina la parola italiana!</p>
	</header>

	<div class="grid md:grid-cols-2 gap-6 mb-6">
		<div class="bg-surface rounded-lg p-6">
			<div class="text-center mb-4">
				<div class="text-sm text-text-secondary mb-1">Categoria</div>
				<div class="text-lg font-semibold capitalize">{$impiccatoStore.targetCategory}</div>
			</div>
			<canvas
				bind:this={canvas}
				width="200"
				height="300"
				class="mx-auto"
			></canvas>
		</div>

		<div class="flex flex-col justify-between">
			<div class="bg-surface rounded-lg p-6 mb-4">
				<div class="text-center">
					<div class="text-sm text-text-secondary mb-2">Vite Rimaste</div>
					<div class="text-4xl font-bold" class:text-error={$impiccatoStore.remainingLives <= 2}>
						{$impiccatoStore.remainingLives}
					</div>
					<div class="flex justify-center gap-1 mt-3">
						{#each Array(6) as _, i}
							<div class="w-4 h-4 rounded-full" class:bg-error={i >= $impiccatoStore.remainingLives} class:bg-success={i < $impiccatoStore.remainingLives}></div>
						{/each}
					</div>
				</div>
			</div>

			<div class="bg-surface rounded-lg p-6">
				<div class="text-center">
					<div class="text-sm text-text-secondary mb-2">Punteggio</div>
					<div class="text-3xl font-bold text-success">{$impiccatoStore.score}</div>
				</div>
			</div>
		</div>
	</div>

	<div class="bg-surface rounded-lg p-6 mb-6">
		<div class="text-4xl font-mono font-bold text-center tracking-wider flex flex-wrap justify-center gap-2">
			{#each getDisplayWord() as letter}
				<span class="min-w-[1.5rem]">{letter}</span>
			{/each}
		</div>
	</div>

	<div class="flex flex-col gap-2">
		{#each KEYBOARD_LAYOUT as row}
			<div class="flex gap-2 justify-center">
				{#each row as letter}
					<button
						on:click={() => handleKeyClick(letter)}
						disabled={isLetterGuessed(letter) || $impiccatoStore.gameState !== 'playing'}
						class="w-12 h-14 rounded font-bold text-lg transition-all
							{isLetterCorrect(letter) ? 'bg-success text-white' : ''}
							{isLetterWrong(letter) ? 'bg-error text-white' : ''}
							{!isLetterGuessed(letter) && $impiccatoStore.gameState === 'playing' ? 'bg-border hover:bg-primary hover:text-white' : ''}
							{isLetterGuessed(letter) || $impiccatoStore.gameState !== 'playing' ? 'opacity-50 cursor-not-allowed' : ''}"
					>
						{letter}
					</button>
				{/each}
			</div>
		{/each}
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
				{$impiccatoStore.gameState === 'won' ? '🎉 Hai Vinto!' : '😢 Hai Perso!'}
			</h2>
			<div class="mb-4">
				<div class="text-2xl font-bold mb-2">{$impiccatoStore.targetWord}</div>
				<div class="text-lg text-text-secondary mb-1">{$impiccatoStore.targetTranslation}</div>
				<div class="text-sm text-text-secondary">{$impiccatoStore.targetDefinition}</div>
			</div>
			<div class="mb-6">
				<div class="text-text-secondary">Punteggio</div>
				<div class="text-3xl font-bold text-success">{$impiccatoStore.score}</div>
			</div>
			<div class="flex gap-2 justify-center">
				<button
					on:click={() => { showModal = false; impiccatoStore.continueGame(); }}
					class="bg-success text-white px-6 py-3 rounded font-semibold hover:opacity-90"
				>
					Continua
				</button>
				<button
					on:click={() => { showModal = false; impiccatoStore.newGame(); }}
					class="bg-primary text-white px-6 py-3 rounded font-semibold hover:opacity-90"
				>
					Nuova Partita
				</button>
			</div>
		</div>
	</div>
{/if}
