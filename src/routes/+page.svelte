<svelte:head>
	<title>Caccia alle Parole - Italian Word Games</title>
</svelte:head>

<main class="home-page">
	<h1>Impara l'Italiano</h1>
	<p class="subtitle">Learn Italian through word games</p>

	<div class="game-cards">
		<a href="/caccia" class="cds-card cds-card--elevated cds-card--interactive">
			<h2>Caccia alle Parole</h2>
			<p>Find hidden Italian words in a grid puzzle</p>
		</a>

		<a href="/parola" class="cds-card cds-card--elevated cds-card--interactive">
			<h2>Paròla</h2>
			<p>Daily 5-letter Italian word puzzle</p>
		</a>
	</div>
</main>

<style>
	.home-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		text-align: center;
	}

	h1 {
		font-size: var(--cds-font-size-5xl);
		font-weight: var(--cds-font-weight-bold);
		margin-bottom: var(--cds-spacing-2);
	}

	.subtitle {
		font-size: var(--cds-font-size-xl);
		color: var(--cds-color-text-secondary);
		margin-bottom: var(--cds-spacing-12);
	}

	.game-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--cds-spacing-8);
	}

	.game-cards a {
		text-decoration: none;
		color: inherit;
	}

	.game-cards h2 {
		font-size: var(--cds-font-size-3xl);
		margin-bottom: var(--cds-spacing-2);
	}

	.game-cards p {
		color: var(--cds-color-text-secondary);
	}

	@media (max-width: 640px) {
		h1 {
			font-size: var(--cds-font-size-3xl);
		}
		.game-cards {
			grid-template-columns: 1fr;
		}
	}
</style>
