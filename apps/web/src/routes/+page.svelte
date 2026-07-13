<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { APP_STORE_URL } from "$lib/config";

  const GAMES = [
    {
      icon: "🟩",
      title: "Paròle",
      desc: "La parola del giorno: sei tentativi per indovinarla e tenere viva la tua serie.",
    },
    {
      icon: "🔍",
      title: "Caccia alle Paròle",
      desc: "Trova le parole nascoste nella griglia — in orizzontale, verticale e diagonale.",
    },
    {
      icon: "🎭",
      title: "Paroliere+",
      desc: "Collega le lettere adiacenti e batti il tempo: 3 minuti di pura adrenalina.",
    },
    {
      icon: "🎈",
      title: "Il Palloncino",
      desc: "Indovina la parola lettera per lettera, prima che il palloncino scoppi.",
    },
    {
      icon: "🔀",
      title: "Anagrammi+",
      desc: "Riordina le lettere contro il tempo e costruisci il tuo punteggio.",
    },
  ];

  const SCREENSHOTS = [
    { src: "/screenshots/02-parola-midplay.png", alt: "Paròle: la sfida del giorno" },
    { src: "/screenshots/04-caccia-midplay.png", alt: "Caccia alle Paròle: la griglia" },
    { src: "/screenshots/07-paroliere-midplay.png", alt: "Paroliere+: collega le lettere" },
    { src: "/screenshots/08-palloncino-midplay.png", alt: "Il Palloncino" },
    { src: "/screenshots/05-anagrammi-midplay.png", alt: "Anagrammi+" },
    { src: "/screenshots/10-classifica.png", alt: "Classifica: i tuoi record" },
    { src: "/screenshots/11-profilo.png", alt: "Il tuo profilo" },
  ];

  const FEATURES = [
    { icon: "🇮🇹", title: "100% in italiano", desc: "Parole, categorie e definizioni pensate per la lingua italiana." },
    { icon: "🔥", title: "Sfida quotidiana", desc: "Una nuova parola ogni giorno e una serie di vittorie da difendere." },
    { icon: "🏆", title: "I tuoi record", desc: "Classifica personale e statistiche sempre con te." },
    { icon: "🔒", title: "Zero account", desc: "Niente registrazione, niente tracciamento: tutto resta sul tuo dispositivo." },
  ];
</script>

<svelte:head>
  <title>Caccia Paròle — Cinque giochi di parole italiane per iPhone</title>
  <meta
    name="description"
    content="Caccia Paròle è l'app iOS con cinque giochi di parole in italiano: Paròle, Caccia alle Paròle, Paroliere+, Il Palloncino e Anagrammi+."
  />
</svelte:head>

<div class="landing">
  <!-- HERO -->
  <section class="hero">
    <div class="hero-inner">
      <div class="hero-copy" in:fly={{ y: 24, duration: 700 }}>
        <p class="overline">GIOCHI DI PAROLE ITALIANE</p>
        <h1>Cinque giochi.<br />Una lingua bellissima.</h1>
        <p class="lede">
          Paròle del giorno, griglie da esplorare, lettere da collegare: Caccia
          Paròle porta i tuoi giochi di parole preferiti su iPhone — in
          italiano, senza account e senza pubblicità.
        </p>
        <div class="store-row">
          {#if APP_STORE_URL}
            <a class="store-badge" href={APP_STORE_URL}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
                <path
                  d="M17.05 12.54c-.03-2.89 2.36-4.28 2.47-4.35-1.35-1.97-3.44-2.24-4.18-2.27-1.78-.18-3.47 1.05-4.37 1.05-.9 0-2.29-1.02-3.77-1-1.94.03-3.72 1.13-4.72 2.86-2.01 3.49-.51 8.66 1.45 11.49.96 1.39 2.1 2.95 3.6 2.89 1.45-.06 2-.93 3.75-.93s2.24.93 3.77.9c1.56-.03 2.55-1.41 3.5-2.8 1.1-1.61 1.55-3.17 1.58-3.25-.04-.02-3.03-1.16-3.08-4.59zM14.17 4.04c.8-.97 1.34-2.32 1.19-3.66-1.15.05-2.55.77-3.38 1.74-.74.85-1.39 2.23-1.22 3.54 1.29.1 2.6-.65 3.41-1.62z"
                />
              </svg>
              <span>
                <small>Scarica su</small>
                App Store
              </span>
            </a>
          {:else}
            <span class="store-badge soon">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
                <path
                  d="M17.05 12.54c-.03-2.89 2.36-4.28 2.47-4.35-1.35-1.97-3.44-2.24-4.18-2.27-1.78-.18-3.47 1.05-4.37 1.05-.9 0-2.29-1.02-3.77-1-1.94.03-3.72 1.13-4.72 2.86-2.01 3.49-.51 8.66 1.45 11.49.96 1.39 2.1 2.95 3.6 2.89 1.45-.06 2-.93 3.75-.93s2.24.93 3.77.9c1.56-.03 2.55-1.41 3.5-2.8 1.1-1.61 1.55-3.17 1.58-3.25-.04-.02-3.03-1.16-3.08-4.59zM14.17 4.04c.8-.97 1.34-2.32 1.19-3.66-1.15.05-2.55.77-3.38 1.74-.74.85-1.39 2.23-1.22 3.54 1.29.1 2.6-.65 3.41-1.62z"
                />
              </svg>
              <span>
                <small>In arrivo su</small>
                App Store
              </span>
            </span>
            <span class="soon-pill">Presto disponibile</span>
          {/if}
        </div>
      </div>
      <div class="hero-phone" in:fly={{ y: 40, delay: 150, duration: 700 }}>
        <div class="phone-frame">
          <img src="/screenshots/01-home.png" alt="La schermata principale di Caccia Paròle" />
        </div>
      </div>
    </div>
    <div class="hero-curve" aria-hidden="true"></div>
  </section>

  <!-- GAMES -->
  <section class="section" id="giochi">
    <div class="section-head" in:fade={{ duration: 600 }}>
      <p class="overline dark">TUTTI I GIOCHI</p>
      <h2>Cinque modi di giocare con le parole</h2>
    </div>
    <div class="games-grid">
      {#each GAMES as game, i (game.title)}
        <div class="game-card" in:fly={{ y: 20, delay: 100 + i * 80, duration: 600 }}>
          <div class="emoji-tile">{game.icon}</div>
          <div>
            <h3>{game.title}</h3>
            <p>{game.desc}</p>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- SCREENSHOTS -->
  <section class="section shots-section" id="screenshots">
    <div class="section-head">
      <p class="overline dark">DENTRO L'APP</p>
      <h2>Dai un'occhiata</h2>
    </div>
    <div class="shots-strip" role="list">
      {#each SCREENSHOTS as shot (shot.src)}
        <figure class="shot" role="listitem">
          <img src={shot.src} alt={shot.alt} loading="lazy" />
          <figcaption>{shot.alt}</figcaption>
        </figure>
      {/each}
    </div>
  </section>

  <!-- FEATURES -->
  <section class="section">
    <div class="features-grid">
      {#each FEATURES as f (f.title)}
        <div class="feature">
          <div class="feature-icon">{f.icon}</div>
          <h3>{f.title}</h3>
          <p>{f.desc}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- CTA -->
  <section class="cta">
    <h2>Pronto per la sfida?</h2>
    <p>Caccia Paròle arriva presto sull'App Store. Nel frattempo, allena il vocabolario.</p>
    {#if APP_STORE_URL}
      <a class="cta-button" href={APP_STORE_URL}>Scarica l'app</a>
    {:else}
      <a class="cta-button" href="/supporto">Scrivici</a>
    {/if}
  </section>

  <footer class="footer">
    <p>&copy; 2026 Caccia Paròle · Made with 🇮🇹 in mind</p>
    <nav>
      <a href="/supporto">Supporto</a>
      <a href="/privacy">Privacy</a>
      <a href="/termini">Termini</a>
    </nav>
  </footer>
</div>

<style>
  .landing {
    --cp-tomato: #c33f2e;
    --cp-tomato-deep: #9e2f21;
    --cp-cream: #f8efe2;
    --cp-card: #fffcf5;
    --cp-tile: #f7e3ce;
    --cp-border: #ebd9c3;
    --cp-ink: #43241b;
    --cp-ink-soft: #96705e;
    --cp-ink-faint: #c9a98b;
    --cp-on-tomato: #fff8ee;
    --cp-rosa: #f3c4b4;
    --cp-display: "Baloo 2", sans-serif;
    --cp-body: "Figtree", sans-serif;

    font-family: var(--cp-body);
    background: var(--cp-cream);
    color: var(--cp-ink);
    margin-top: -72px; /* pull under the fixed nav so the hero owns the top */
    padding-top: 72px;
  }

  :global(body) {
    background: #f8efe2;
    margin: 0;
  }

  .overline {
    font-family: var(--cp-body);
    font-weight: 600;
    font-size: 0.82rem;
    letter-spacing: 0.24em;
    color: var(--cp-rosa);
    margin: 0 0 10px;
  }
  .overline.dark {
    color: var(--cp-tomato);
  }

  /* HERO */
  .hero {
    position: relative;
    background: var(--cp-tomato);
    color: var(--cp-on-tomato);
    overflow: hidden;
  }
  .hero-inner {
    max-width: 1080px;
    margin: 0 auto;
    padding: 96px 24px 40px;
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 48px;
    align-items: center;
  }
  .hero-copy h1 {
    font-family: var(--cp-display);
    font-weight: 800;
    font-size: clamp(2.4rem, 5vw, 3.6rem);
    line-height: 1.05;
    margin: 0 0 18px;
    color: var(--cp-on-tomato);
  }
  .lede {
    font-size: 1.13rem;
    line-height: 1.65;
    font-weight: 500;
    color: #f9ddd0;
    margin: 0 0 30px;
    max-width: 34rem;
  }

  .store-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .store-badge {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    background: #1c0e0a;
    color: #fff;
    border-radius: 14px;
    padding: 10px 20px 12px;
    text-decoration: none;
    line-height: 1.15;
    transition: transform 0.2s ease;
  }
  .store-badge:hover {
    transform: translateY(-2px);
  }
  .store-badge small {
    display: block;
    font-size: 0.68rem;
    font-weight: 500;
    opacity: 0.85;
  }
  .store-badge span {
    font-family: var(--cp-display);
    font-weight: 700;
    font-size: 1.25rem;
  }
  .store-badge.soon {
    opacity: 0.92;
    cursor: default;
  }
  .soon-pill {
    background: var(--cp-on-tomato);
    color: var(--cp-tomato);
    font-weight: 700;
    font-size: 0.85rem;
    border-radius: 999px;
    padding: 8px 16px;
  }

  .hero-phone {
    display: flex;
    justify-content: center;
  }
  .phone-frame {
    width: min(300px, 70vw);
    border-radius: 44px;
    border: 10px solid #2b1510;
    box-shadow: 0 30px 60px rgba(43, 21, 16, 0.45);
    overflow: hidden;
    background: #2b1510;
    transform: rotate(2.5deg);
  }
  .phone-frame img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 34px;
  }

  .hero-curve {
    height: 56px;
    background: var(--cp-cream);
    border-top-left-radius: 36px;
    border-top-right-radius: 36px;
    margin-top: -20px;
    position: relative;
  }

  /* SECTIONS */
  .section {
    max-width: 1080px;
    margin: 0 auto;
    padding: 56px 24px;
  }
  .section-head {
    text-align: center;
    margin-bottom: 40px;
  }
  .section-head h2,
  .cta h2 {
    font-family: var(--cp-display);
    font-weight: 800;
    font-size: clamp(1.7rem, 3.5vw, 2.4rem);
    margin: 0;
    color: var(--cp-ink);
  }

  .games-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
    gap: 18px;
  }
  .game-card {
    display: flex;
    gap: 18px;
    align-items: flex-start;
    background: var(--cp-card);
    border-radius: 22px;
    padding: 22px;
    box-shadow: 0 8px 10px -6px rgba(120, 52, 30, 0.12);
  }
  .emoji-tile {
    flex: none;
    width: 54px;
    height: 54px;
    border-radius: 18px;
    background: var(--cp-tile);
    display: grid;
    place-items: center;
    font-size: 1.65rem;
  }
  .game-card h3 {
    font-family: var(--cp-display);
    font-weight: 700;
    font-size: 1.3rem;
    margin: 0 0 4px;
  }
  .game-card p {
    margin: 0;
    color: var(--cp-ink-soft);
    font-size: 0.98rem;
    line-height: 1.5;
  }

  /* SCREENSHOTS */
  .shots-section {
    padding-bottom: 24px;
  }
  .shots-strip {
    display: flex;
    gap: 22px;
    overflow-x: auto;
    padding: 8px 4px 24px;
    scroll-snap-type: x mandatory;
  }
  .shot {
    flex: none;
    margin: 0;
    scroll-snap-align: center;
    text-align: center;
  }
  .shot img {
    width: 218px;
    height: auto;
    border-radius: 28px;
    border: 6px solid #2b1510;
    background: #2b1510;
    box-shadow: 0 16px 32px rgba(120, 52, 30, 0.22);
    display: block;
  }
  .shot figcaption {
    margin-top: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--cp-ink-soft);
  }

  /* FEATURES */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 18px;
  }
  .feature {
    background: var(--cp-tile);
    border-radius: 22px;
    padding: 26px 22px;
    text-align: center;
  }
  .feature-icon {
    font-size: 2rem;
    margin-bottom: 10px;
  }
  .feature h3 {
    font-family: var(--cp-display);
    font-weight: 700;
    font-size: 1.15rem;
    margin: 0 0 6px;
  }
  .feature p {
    margin: 0;
    color: var(--cp-ink-soft);
    font-size: 0.93rem;
    line-height: 1.5;
  }

  /* CTA */
  .cta {
    max-width: 720px;
    margin: 24px auto 0;
    padding: 56px 24px 72px;
    text-align: center;
  }
  .cta p {
    color: var(--cp-ink-soft);
    font-size: 1.05rem;
    margin: 12px 0 26px;
  }
  .cta-button {
    display: inline-block;
    background: var(--cp-tomato);
    color: var(--cp-on-tomato);
    font-family: var(--cp-display);
    font-weight: 700;
    font-size: 1.15rem;
    padding: 14px 38px;
    border-radius: 16px;
    text-decoration: none;
    box-shadow: 0 12px 24px rgba(195, 63, 46, 0.3);
    transition: transform 0.2s ease, background 0.2s ease;
  }
  .cta-button:hover {
    background: var(--cp-tomato-deep);
    transform: translateY(-2px);
  }

  /* FOOTER */
  .footer {
    border-top: 2px solid var(--cp-border);
    padding: 28px 24px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    max-width: 1080px;
    margin: 0 auto;
    color: var(--cp-ink-faint);
    font-size: 0.92rem;
    flex-wrap: wrap;
  }
  .footer p {
    margin: 0;
  }
  .footer nav {
    display: flex;
    gap: 20px;
  }
  .footer a {
    color: var(--cp-ink-soft);
    font-weight: 600;
    text-decoration: none;
  }
  .footer a:hover {
    color: var(--cp-tomato);
  }

  @media (max-width: 820px) {
    .hero-inner {
      grid-template-columns: 1fr;
      text-align: center;
      padding-top: 72px;
    }
    .lede {
      margin-left: auto;
      margin-right: auto;
    }
    .store-row {
      justify-content: center;
    }
    .phone-frame {
      transform: none;
    }
  }
</style>
