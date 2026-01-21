<script lang="ts">
	import { onMount } from 'svelte';
	import confetti from 'canvas-confetti';

	export let trigger = false;
	export let duration = 3000;
	export let particleCount = 150;

	let previousTrigger = false;

	$: if (trigger && !previousTrigger) {
		fireConfetti();
		previousTrigger = true;
	}

	$: if (!trigger && previousTrigger) {
		previousTrigger = false;
	}

	function fireConfetti() {
		const end = Date.now() + duration;

		const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

		(function frame() {
			confetti({
				particleCount: 2,
				angle: 60,
				spread: 55,
				origin: { x: 0 },
				colors: colors
			});
			confetti({
				particleCount: 2,
				angle: 120,
				spread: 55,
				origin: { x: 1 },
				colors: colors
			});

			if (Date.now() < end) {
				requestAnimationFrame(frame);
			}
		})();

		confetti({
			particleCount: particleCount,
			spread: 70,
			origin: { y: 0.6 }
		});
	}

	onMount(() => {
		if (trigger) {
			fireConfetti();
		}
	});
</script>
