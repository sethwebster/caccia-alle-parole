<svelte:head>
	<title>Giochi di Parole Italiane</title>
</svelte:head>

<div class="cds-container">
	<header class="header">
		<h1 class="cds-heading-1 cds-text-center">Giochi di Parole Italiane</h1>
		<p class="cds-text-lg cds-text-center cds-text-secondary-color">Scegli il tuo gioco preferito</p>
	</header>

	<div class="mode-selector">
		<h2 class="cds-heading-3 cds-text-center cds-mb-6">Seleziona Modalità di Gioco</h2>
		<div class="mode-cards">
			<a href="/caccia" class="mode-card">
				<div class="mode-icon">🔍</div>
				<h3 class="cds-card__title">Caccia alle Parole</h3>
				<p class="cds-text-sm cds-text-secondary-color">Trova tutte le parole nascoste nella griglia</p>
			</a>
			<a href="/parola" class="mode-card">
				<div class="mode-icon">🔤</div>
				<h3 class="cds-card__title">Paròla</h3>
				<p class="cds-text-sm cds-text-secondary-color">Indovina la parola del giorno in 6 tentativi</p>
			</a>
		</div>
	</div>
</div>

<style>
	.header {
		text-align: center;
		margin-bottom: 32px;
		padding: 24px 0;
	}

	.mode-selector {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
	}

	.mode-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 16px;
		width: 100%;
		max-width: 700px;
	}

	.mode-card {
		background: var(--cds-color-surface);
		border-radius: var(--cds-radius-xl);
		padding: 32px 24px;
		text-align: center;
		border: 2px solid transparent;
		box-shadow: var(--cds-shadow-sm);
		transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		cursor: pointer;
		text-decoration: none;
		color: inherit;
		display: block;
	}

	.mode-card:hover {
		transform: translateY(-4px);
		box-shadow: var(--cds-shadow-card);
		border-color: var(--cds-color-secondary);
	}

	.mode-card:active {
		transform: scale(0.98);
	}

	.mode-icon {
		font-size: 3.5rem;
		margin-bottom: 16px;
		display: inline-block;
		transition: transform 0.3s ease;
	}

	.mode-card:hover .mode-icon {
		transform: scale(1.1) rotate(5deg);
	}

	.mode-card h3 {
		color: var(--cds-color-dark);
		font-size: 1.25rem;
		margin-bottom: 8px;
	}

	.mode-card p {
		color: var(--cds-color-text-secondary);
		font-size: 0.9rem;
		line-height: 1.4;
	}

	@media (max-width: 640px) {
		.mode-cards {
			grid-template-columns: 1fr;
		}

		.header {
			padding: 16px 0;
			margin-bottom: 24px;
		}

		.mode-card {
			padding: 24px 20px;
		}

		.mode-icon {
			font-size: 2.5rem;
		}
	}
</style>
