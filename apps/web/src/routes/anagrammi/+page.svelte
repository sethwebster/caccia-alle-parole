<script lang="ts">
	import AnagrammiGame from '$lib/components/AnagrammiGame.svelte';
</script>

<svelte:head>
	<title>Anagrammi - Italian Anagram Game</title>
</svelte:head>

<AnagrammiGame />

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
