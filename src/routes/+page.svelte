<svelte:head>
	<title>Caccia alle Parole - Italian Word Games</title>
</svelte:head>

<main class="max-w-3xl mx-auto p-8 text-center">
	<h1 class="text-5xl font-bold mb-2 text-[var(--cds-color-text-primary)]">Impara l'Italiano</h1>
	<p class="text-xl text-[var(--cds-color-text-secondary)] mb-12">Learn Italian through word games</p>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
		<a href="/caccia" class="cds-card cds-card--elevated cds-card--interactive no-underline text-inherit">
			<h2 class="text-3xl font-semibold mb-2">Caccia alle Parole</h2>
			<p class="text-[var(--cds-color-text-secondary)]">Find hidden Italian words in a grid puzzle</p>
		</a>

		<a href="/parola" class="cds-card cds-card--elevated cds-card--interactive no-underline text-inherit">
			<h2 class="text-3xl font-semibold mb-2">Paròla</h2>
			<p class="text-[var(--cds-color-text-secondary)]">Daily 5-letter Italian word puzzle</p>
		</a>
	</div>
</main>
