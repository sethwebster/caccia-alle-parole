<script lang="ts">
	import ImpiccatoGame from '$lib/components/ImpiccatoGame.svelte';
</script>

<svelte:head>
	<title>Impiccato - Italian Hangman</title>
</svelte:head>

<ImpiccatoGame />

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
