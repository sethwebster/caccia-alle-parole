<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';

	onMount(() => {
		// Clear legacy localStorage on first visit to SvelteKit version
		if (typeof localStorage !== 'undefined' && !localStorage.getItem('sveltekit_migrated')) {
			localStorage.clear();
			localStorage.setItem('sveltekit_migrated', 'true');
		}
	});
</script>

<div class="min-h-screen bg-surface-secondary">
	<slot />
</div>
