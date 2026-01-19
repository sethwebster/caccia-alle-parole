<script lang="ts">
	import WordleGame from '$lib/components/WordleGame.svelte';
</script>

<svelte:head>
	<title>Paròla - Daily Italian Word Puzzle</title>
</svelte:head>

<WordleGame />

<div class="back-link">
	<a href="/">← Back to Home</a>
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
