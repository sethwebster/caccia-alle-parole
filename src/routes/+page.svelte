<svelte:head>
	<title>Caccia alle Parole - Italian Word Games</title>
</svelte:head>

<main>
	<h1>Impara l'Italiano</h1>
	<p>Learn Italian through word games</p>

	<div class="game-cards">
		<a href="/caccia" class="game-card">
			<h2>Caccia alle Parole</h2>
			<p>Find hidden Italian words in a grid puzzle</p>
		</a>

		<a href="/parola" class="game-card">
			<h2>Paròla</h2>
			<p>Daily 5-letter Italian word puzzle</p>
		</a>
	</div>
</main>

<style>
	main {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		text-align: center;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	h1 {
		font-size: 3rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
	}

	p {
		font-size: 1.25rem;
		color: #666;
		margin-bottom: 3rem;
	}

	.game-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
	}

	.game-card {
		background: white;
		border: 2px solid #e0e0e0;
		border-radius: 16px;
		padding: 2rem;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;
	}

	.game-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
		border-color: #4a90e2;
	}

	.game-card h2 {
		font-size: 1.75rem;
		margin-bottom: 0.5rem;
	}

	@media (max-width: 640px) {
		h1 {
			font-size: 2rem;
		}
		.game-cards {
			grid-template-columns: 1fr;
		}
	}
</style>
