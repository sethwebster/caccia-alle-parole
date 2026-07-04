<script lang="ts">
  import { page } from "$app/stores";
  import { afterNavigate } from "$app/navigation";
  import { wordleUI } from "$lib/stores/wordle";
  import { fade } from "svelte/transition";

  let menuOpen = $state(false);

  // Covers browser back/forward too — the full-screen menu would otherwise
  // stay open over the new page and block all clicks.
  afterNavigate(() => {
    menuOpen = false;
  });

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }
</script>

<nav class="premium-nav">
  <div class="cds-container">
    <div class="nav-content">
      <a href="/" class="brand" onclick={closeMenu}>
        <img
          src="/caccia-parole-logo.png"
          alt="Caccia Paròle Logo"
          class="brand-logo"
        />
        <span class="brand-name">Caccia Paròle</span>
      </a>

      <div class="nav-actions">
        <div class="links desktop-only">
          <a href="/parola" class:active={$page.url.pathname === "/parola"}>Paròle</a>
          <a href="/caccia" class:active={$page.url.pathname === "/caccia"}>Caccia</a>
          <a href="/paroliere" class:active={$page.url.pathname === "/paroliere"}>Paroliere</a>
          <a href="/impiccato" class:active={$page.url.pathname === "/impiccato"}>Impiccato</a>
          <a href="/anagrammi" class:active={$page.url.pathname === "/anagrammi"}>Anagrammi</a>
        </div>

        {#if $page.url.pathname.includes("/parola")}
          <button
            class="icon-btn"
            onclick={() => ($wordleUI.showModal = true)}
            aria-label="Come giocare"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              ><circle cx="12" cy="12" r="10" /><path
                d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
              /><path d="M12 17h.01" /></svg
            >
          </button>
        {/if}

        <button
          class="menu-toggle"
          class:open={menuOpen}
          onclick={toggleMenu}
          aria-label="Menu"
        >
          <span class="bar"></span>
          <span class="bar"></span>
        </button>
      </div>
    </div>
  </div>

  {#if menuOpen}
    <div class="mobile-menu" transition:fade={{ duration: 200 }}>
      <div class="mobile-links">
        <a href="/" onclick={closeMenu}>Home</a>
        <a href="/parola" onclick={closeMenu}>Paròle</a>
        <a href="/caccia" onclick={closeMenu}>Caccia alle Paròle</a>
        <a href="/paroliere" onclick={closeMenu}>Paroliere</a>
        <a href="/impiccato" onclick={closeMenu}>Impiccato</a>
        <a href="/anagrammi" onclick={closeMenu}>Anagrammi</a>
      </div>
    </div>
  {/if}
</nav>

<style>
  .premium-nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    height: 72px;
    display: flex;
    align-items: center;
  }

  .nav-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: inherit;
  }

  .brand-logo {
    height: 40px;
    width: auto;
    object-fit: contain;
  }

  .brand-name {
    font-family: var(--cds-font-family-display);
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 32px;
  }

  .links {
    display: flex;
    gap: 24px;
  }

  .links a {
    text-decoration: none;
    color: var(--cds-color-text-secondary);
    font-size: 0.9rem;
    font-weight: 600;
    transition: color 0.2s;
  }

  .links a:hover,
  .links a.active {
    color: var(--cds-color-primary);
  }

  .menu-toggle {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
  }

  .bar {
    width: 24px;
    height: 2px;
    background: var(--cds-color-text-primary);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 2px;
  }

  .menu-toggle.open .bar:first-child {
    transform: translateY(4px) rotate(45deg);
  }
  .menu-toggle.open .bar:last-child {
    transform: translateY(-4px) rotate(-45deg);
  }

  .mobile-menu {
    position: fixed;
    top: 72px;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    z-index: 90;
    padding: 40px 20px;
  }

  .mobile-links {
    display: flex;
    flex-direction: column;
    gap: 24px;
    align-items: center;
  }

  .mobile-links a {
    font-family: var(--cds-font-family-display);
    font-size: 1.5rem;
    font-weight: 700;
    text-decoration: none;
    color: var(--cds-color-text-primary);
  }

  @media (max-width: 768px) {
    .desktop-only {
      display: none;
    }
  }

  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--cds-color-text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border-radius: 8px;
    transition: all 0.2s;
  }
  .icon-btn:hover {
    background: var(--cds-color-gray-100);
    color: var(--cds-color-primary);
  }
</style>
