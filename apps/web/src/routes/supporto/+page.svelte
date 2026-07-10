<script lang="ts">
  import ObfuscatedEmail from "$lib/components/ui/ObfuscatedEmail.svelte";

  const FAQ = [
    {
      q: "I miei progressi sono spariti. Posso recuperarli?",
      a: "I progressi di Caccia Paròle vivono solo sul tuo dispositivo: non esistono account né copie sui nostri server. Se l'app viene disinstallata, i dati locali vengono rimossi da iOS e purtroppo non possiamo recuperarli.",
    },
    {
      q: "Come cambio nome o foto del profilo?",
      a: "Apri la scheda Profilo: tocca la foto per sceglierne una nuova dalla tua libreria, oppure tocca “Modifica nome” per cambiare il nome visualizzato.",
    },
    {
      q: "A cosa serve l'accesso alle foto?",
      a: "Solo a impostare l'immagine del profilo. La foto scelta viene salvata sul dispositivo e non lascia mai il tuo iPhone.",
    },
    {
      q: "La parola del giorno non si aggiorna.",
      a: "Paròle propone una nuova parola a mezzanotte (ora locale). Se non appare, chiudi e riapri l'app; se il problema continua, scrivici indicando la data e il modello di iPhone.",
    },
    {
      q: "Ho trovato un errore o una parola mancante.",
      a: "Fantastico — le segnalazioni sui dizionari sono preziosissime. Mandaci la parola e il gioco in cui l'hai incontrata e la valuteremo per il prossimo aggiornamento.",
    },
  ];
</script>

<svelte:head>
  <title>Supporto — Caccia Paròle</title>
  <meta name="description" content="Assistenza per l'app Caccia Paròle: domande frequenti e contatti." />
</svelte:head>

<div class="support">
  <header>
    <p class="overline">SUPPORTO</p>
    <h1>Come possiamo aiutarti?</h1>
    <p class="lede">
      Risposte rapide alle domande più comuni su Caccia Paròle. Non trovi
      quello che cerchi? Scrivici, rispondiamo di persona.
    </p>
    <ObfuscatedEmail class="mail-button" icon="✉️" subject="Supporto Caccia Paròle" />
  </header>

  <section class="faq">
    {#each FAQ as item (item.q)}
      <details>
        <summary>{item.q}</summary>
        <p>{item.a}</p>
      </details>
    {/each}
  </section>

  <p class="back"><a href="/">← Torna alla home</a> · <a href="/privacy">Informativa privacy</a></p>
</div>

<style>
  .support {
    max-width: 720px;
    margin: 0 auto;
    padding: 120px 24px 80px;
    font-family: "Figtree", sans-serif;
    color: #43241b;
  }

  :global(body) {
    background: #f8efe2;
  }

  .overline {
    font-weight: 600;
    font-size: 0.82rem;
    letter-spacing: 0.24em;
    color: #c33f2e;
    margin: 0 0 10px;
  }

  h1 {
    font-family: "Baloo 2", sans-serif;
    font-weight: 800;
    font-size: clamp(2rem, 4.5vw, 2.8rem);
    margin: 0 0 14px;
  }

  .lede {
    color: #96705e;
    font-size: 1.08rem;
    line-height: 1.6;
    margin: 0 0 24px;
  }

  /* :global — the element lives inside the ObfuscatedEmail component,
     so scoped selectors would not reach it. */
  .support :global(.mail-button) {
    display: inline-block;
    background: #c33f2e;
    color: #fff8ee;
    font-family: "Baloo 2", sans-serif;
    font-weight: 700;
    font-size: 1.05rem;
    padding: 12px 26px;
    border-radius: 16px;
    text-decoration: none;
    box-shadow: 0 12px 24px rgba(195, 63, 46, 0.25);
  }
  .support :global(a.mail-button:hover) {
    background: #9e2f21;
  }

  .faq {
    margin-top: 44px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  details {
    background: #fffcf5;
    border-radius: 22px;
    padding: 18px 22px;
    box-shadow: 0 8px 10px -6px rgba(120, 52, 30, 0.12);
  }

  summary {
    font-family: "Baloo 2", sans-serif;
    font-weight: 700;
    font-size: 1.08rem;
    cursor: pointer;
    list-style: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary::after {
    content: "+";
    font-size: 1.4rem;
    color: #c33f2e;
    flex: none;
  }
  details[open] summary::after {
    content: "–";
  }

  details p {
    margin: 12px 0 4px;
    color: #96705e;
    line-height: 1.6;
  }

  .back {
    margin-top: 44px;
    text-align: center;
    color: #c9a98b;
  }
  .back a {
    color: #96705e;
    font-weight: 600;
    text-decoration: none;
  }
  .back a:hover {
    color: #c33f2e;
  }
</style>
