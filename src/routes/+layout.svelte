<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import TopNav from '$lib/components/ui/TopNav.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';

	let { children } = $props();

	onMount(() => {
		// Clear legacy localStorage on first visit to SvelteKit version
		if (typeof localStorage !== 'undefined' && !localStorage.getItem('sveltekit_migrated')) {
			localStorage.clear();
			localStorage.setItem('sveltekit_migrated', 'true');
		}
	});
</script>

<TopNav />

<div class="app-content min-h-screen" style="background: var(--cds-color-background);">
	{@render children()}
</div>

<Toast position="top-right" />
