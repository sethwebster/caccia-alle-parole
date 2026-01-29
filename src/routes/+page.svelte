<script lang="ts">
  import { fade, fly } from "svelte/transition";
</script>

<svelte:head>
  <title>Caccia Paròle | Giochi di Parole Italiane</title>
</svelte:head>

<div class="page-wrapper">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>

  <div class="cds-container relative z-10">
    <header class="main-header" in:fade={{ duration: 800 }}>
      <div class="brand">
        <img
          src="/caccia-parole-logo.png"
          alt="Caccia Paròle Logo"
          class="brand-logo-main"
        />
        <h1 class="brand-name">Caccia Paròle</h1>
      </div>
      <p class="tagline">La sfida quotidiana con la lingua italiana</p>
    </header>

    <main class="game-selection">
      <div class="section-title" in:fade={{ delay: 200, duration: 800 }}>
        <h2>Scegli la tua sfida</h2>
        <div class="status-badge">5 Giochi Disponibili</div>
      </div>

      <div class="grid-layout">
        <div in:fly={{ y: 20, delay: 300, duration: 800 }}>
          <a href="/parola" class="premium-card wordle">
            <div class="card-content">
              <div class="icon-orb">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><rect
                    width="18"
                    height="18"
                    x="3"
                    y="3"
                    rx="2"
                    ry="2"
                  /><path d="m9 8 3 3 3-3" /><path d="m9 13 3 3 3-3" /></svg
                >
              </div>
              <div class="card-text">
                <h3>Paròle</h3>
                <p>Indovina la parola del giorno</p>
              </div>
            </div>
            <div class="card-badge">Nuovo Puzzle</div>
          </a>
        </div>

        <div in:fly={{ y: 20, delay: 400, duration: 800 }}>
          <a href="/caccia" class="premium-card wordsearch">
            <div class="card-content">
              <div class="icon-orb">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><circle cx="11" cy="11" r="8" /><path
                    d="m21 21-4.3-4.3"
                  /><path d="M7 11h8" /><path d="M11 7v8" /></svg
                >
              </div>
              <div class="card-text">
                <h3>Caccia+</h3>
                <p>Trova i termini nascosti</p>
              </div>
            </div>
          </a>
        </div>

        <div in:fly={{ y: 20, delay: 500, duration: 800 }}>
          <a href="/paroliere" class="premium-card boggle">
            <div class="card-content">
              <div class="icon-orb">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><rect width="18" height="18" x="3" y="3" rx="2" /><path
                    d="M7 7h.01"
                  /><path d="M17 7h.01" /><path d="M7 17h.01" /><path
                    d="M17 17h.01"
                  /><path d="M12 12h.01" /></svg
                >
              </div>
              <div class="card-text">
                <h3>Paroliere+</h3>
                <p>3 minuti di pura adrenalina</p>
              </div>
            </div>
          </a>
        </div>

        <div in:fly={{ y: 20, delay: 600, duration: 800 }}>
          <a href="/impiccato" class="premium-card hangman">
            <div class="card-content">
              <div class="icon-orb">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><path d="M14.5 2V5H17.5" /><path d="M10 2V5H7" /><path
                    d="M10 13H14"
                  /><path d="M12 21V7" /><path d="M12 12a1 1 0 0 0 1 1" /><path
                    d="M11 13a1 1 0 0 0 1-1"
                  /><path d="M12 7a1 1 0 0 1 1 1" /><path
                    d="M11 8a1 1 0 0 1 1-1"
                  /></svg
                >
              </div>
              <div class="card-text">
                <h3>Impiccato</h3>
                <p>Indovina lettera per lettera</p>
              </div>
            </div>
          </a>
        </div>

        <div in:fly={{ y: 20, delay: 700, duration: 800 }}>
          <a href="/anagrammi" class="premium-card anagrams">
            <div class="card-content">
              <div class="icon-orb">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><path d="m21 16-4 4-4-4" /><path d="M17 20V4" /><path
                    d="m3 8 4-4 4 4"
                  /><path d="M7 4v16" /></svg
                >
              </div>
              <div class="card-text">
                <h3>Anagrammi+</h3>
                <p>Riordina per svelare</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </main>

    <footer class="main-footer" in:fade={{ delay: 1000 }}>
      <p>&copy; 2026 Caccia Paròle • Made with 🇮🇹 in mind</p>
    </footer>
  </div>
</div>

<style>
  :global(body) {
    background-color: #f8fafc;
    overflow-x: hidden;
    margin: 0;
  }

  .page-wrapper {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
    padding: 80px 0;
  }

  /* Decorative Blobs */
  .blob {
    position: absolute;
    width: 600px;
    height: 600px;
    filter: blur(80px);
    border-radius: 50%;
    z-index: 1;
    opacity: 0.4;
  }

  .blob-1 {
    top: -200px;
    right: -100px;
    background: #6366f1;
  }

  .blob-2 {
    bottom: -200px;
    left: -100px;
    background: #10b981;
  }

  .main-header {
    text-align: center;
    margin-bottom: 80px;
  }

  .brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    margin-bottom: 16px;
  }

  .brand-logo-main {
    height: 80px;
    width: auto;
    object-fit: contain;
    margin-right: 10px;
  }

  .brand-name {
    font-family: var(--cds-font-family-display);
    font-size: 3.5rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--cds-color-text-primary);
    margin: 0;
  }

  .tagline {
    color: var(--cds-color-text-secondary);
    font-size: 1.25rem;
    font-weight: 500;
  }

  .section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 40px;
  }

  .section-title h2 {
    font-family: var(--cds-font-family-display);
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--cds-color-text-primary);
    margin: 0;
  }

  .status-badge {
    background: white;
    padding: 8px 16px;
    border-radius: 99px;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--cds-color-text-secondary);
    border: 1px solid var(--cds-color-border);
    box-shadow: var(--cds-shadow-sm);
  }

  .grid-layout {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
  }

  @media (max-width: 768px) {
    .page-wrapper {
      padding: 40px 0;
    }

    .grid-layout {
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .brand-name {
      font-size: 2.5rem;
    }

    .main-header {
      margin-bottom: 60px;
    }
  }

  .premium-card {
    position: relative;
    background: var(--cds-color-surface);
    border-radius: 32px;
    padding: 40px;
    text-decoration: none;
    color: inherit;
    border: 1px solid var(--cds-color-border);
    box-shadow: var(--cds-shadow-card);
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
    display: block;
    height: 100%;
  }

  .premium-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      transparent 60%,
      rgba(99, 102, 241, 0.05) 100%
    );
    opacity: 0;
    transition: opacity 0.3s;
  }

  .premium-card:hover {
    transform: translateY(-8px);
    box-shadow: var(--cds-shadow-card-hover);
    border-color: var(--cds-color-primary);
  }

  .premium-card:hover::before {
    opacity: 1;
  }

  .premium-card.wordle {
    background: white;
    border-width: 2px;
  }

  .card-content {
    display: flex;
    align-items: center;
    gap: 32px;
    position: relative;
    z-index: 1;
  }

  .icon-orb {
    width: 80px;
    height: 80px;
    background: var(--cds-color-gray-50);
    border-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: var(--cds-shadow-sm);
  }

  .premium-card:hover .icon-orb {
    transform: scale(1.1) rotate(8deg);
    background: var(--cds-color-primary-light);
    box-shadow: var(--cds-glow-primary);
  }

  .card-text h3 {
    font-family: var(--cds-font-family-display);
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 6px 0;
    color: var(--cds-color-text-primary);
    letter-spacing: -0.01em;
  }

  .card-text p {
    margin: 0;
    color: var(--cds-color-text-secondary);
    font-size: 1.1rem;
    line-height: 1.4;
  }

  .card-badge {
    position: absolute;
    top: 32px;
    right: 32px;
    background: var(--cds-color-primary);
    color: white;
    font-size: 0.75rem;
    font-weight: 800;
    padding: 6px 14px;
    border-radius: 99px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .main-footer {
    margin-top: 80px;
    text-align: center;
    color: var(--cds-color-text-tertiary);
    font-size: 1rem;
    font-weight: 500;
  }
</style>
