<script lang="ts">
	import ParoliereGame from '$lib/components/ParoliereGame.svelte';
</script>

<svelte:head>
	<title>Paroliere - Italian Boggle</title>
</svelte:head>

<ParoliereGame />

<div class="back-link">
	<a href="/">← Torna alla Home</a>
</div>

<style>
	.back-link {
		text-align: center;
		margin-top: 2rem;
	}

	a {
		color: #4a90e2;
		text-decoration: none;
		font-weight: 500;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
