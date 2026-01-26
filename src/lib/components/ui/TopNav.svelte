<script lang="ts">
	import { page } from '$app/stores';
	import { wordleUI } from '$lib/stores/wordle';

	let menuOpen = $state(false);

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function closeMenu() {
		menuOpen = false;
	}
</script>

<nav class="top-nav">
	<div class="cds-container">
		<div class="top-nav__inner">
			<div class="top-nav__brand">
				<a href="/" class="top-nav__logo" onclick={closeMenu}>
					{#if $page.url.pathname === '/parola'}
						<span class="top-nav__title font-serif tracking-wider uppercase text-xl">Paròla</span>
					{:else}
						🇮🇹 <span class="top-nav__title">Giochi di Parole</span>
					{/if}
				</a>
			</div>

			<div class="flex items-center gap-2">
				{#if $page.url.pathname === '/parola'}
					<button 
						class="text-xl font-bold px-3 py-1 hover:bg-black/5 rounded transition-colors"
						onclick={() => $wordleUI.showModal = true}
						aria-label="How to play"
					>
						?
					</button>
				{/if}

				<button
					class="top-nav__toggle"
					class:active={menuOpen}
					onclick={toggleMenu}
					aria-label="Menu"
				>
					<span></span>
					<span></span>
					<span></span>
				</button>
			</div>

			<div class="top-nav__menu" class:active={menuOpen}>
				<a
					href="/"
					class="top-nav__link"
					class:active={$page.url.pathname === '/'}
					onclick={closeMenu}
				>
					Home
				</a>
				<a
					href="/parola"
					class="top-nav__link"
					class:active={$page.url.pathname === '/parola'}
					onclick={closeMenu}
				>
					Paròla
				</a>
				<a
					href="/caccia"
					class="top-nav__link"
					class:active={$page.url.pathname === '/caccia'}
					onclick={closeMenu}
				>
					Caccia
				</a>
			</div>
		</div>
	</div>
</nav>
