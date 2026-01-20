<script lang="ts">
	import { page } from '$app/stores';

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
					🇮🇹 <span class="top-nav__title">Giochi di Parole</span>
				</a>
			</div>

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
