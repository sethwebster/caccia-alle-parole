<script lang="ts">
  import ObfuscatedEmail from "$lib/components/ui/ObfuscatedEmail.svelte";
</script>

<svelte:head>
  <title>Termini d'uso — Caccia Paròle</title>
  <meta name="description" content="Termini d'uso dell'app Caccia Paròle: licenza, abbonamento Premium, prova gratuita e rinnovo automatico." />
</svelte:head>

<div class="terms">
  <p class="overline">TERMINI D'USO</p>
  <h1>Le regole del gioco, senza sorprese.</h1>
  <p class="updated">Ultimo aggiornamento: 13 luglio 2026</p>

  <section>
    <h2>Licenza d'uso</h2>
    <p>
      Caccia Paròle è concessa in licenza per uso personale e non commerciale
      sui dispositivi Apple che possiedi o controlli, secondo il
      <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">contratto di licenza standard di Apple (EULA)</a>.
      Contenuti, giochi e materiali dell'app restano di proprietà dello
      sviluppatore.
    </p>
  </section>

  <section>
    <h2>Caccia Parole Premium</h2>
    <p>
      La Sfida Giornaliera, l'archivio e i replay richiedono l'abbonamento
      Caccia Parole Premium, disponibile in versione mensile o annuale. I
      giochi di pratica restano gratuiti. I prezzi sono mostrati nell'app
      prima dell'acquisto e possono variare in base al Paese.
    </p>
  </section>

  <section>
    <h2>Prova gratuita e rinnovo automatico</h2>
    <p>
      L'abbonamento include una prova gratuita di 7 giorni per i nuovi
      abbonati. Al termine della prova, e a ogni scadenza successiva,
      l'abbonamento si rinnova automaticamente al prezzo indicato, salvo
      disdetta almeno 24 ore prima del rinnovo. Il pagamento è addebitato
      sull'account Apple; puoi gestire o disdire l'abbonamento in qualsiasi
      momento dalle impostazioni dell'App Store. La parte non utilizzata della
      prova gratuita decade all'acquisto dell'abbonamento.
    </p>
  </section>

  <section>
    <h2>Rimborsi</h2>
    <p>
      Gli acquisti sono gestiti da Apple: le richieste di rimborso seguono le
      politiche dell'App Store e si presentano su
      <a href="https://reportaproblem.apple.com">reportaproblem.apple.com</a>.
    </p>
  </section>

  <section>
    <h2>Uso corretto</h2>
    <p>
      Non è consentito decompilare, modificare o ridistribuire l'app, né
      utilizzarla in modo da violare leggi applicabili o diritti di terzi.
      L'app è fornita "così com'è", senza garanzie di disponibilità continua
      dei contenuti.
    </p>
  </section>

  <section>
    <h2>Contatti</h2>
    <p>
      Per qualsiasi domanda su questi termini scrivi a
      <ObfuscatedEmail subject="Termini Caccia Paròle" /> o visita la pagina di
      <a href="/supporto">supporto</a>.
    </p>
  </section>

  <p class="back"><a href="/">← Torna alla home</a></p>
</div>

<style>
  .terms {
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
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    line-height: 1.15;
    margin: 0 0 8px;
  }

  .updated {
    color: #c9a98b;
    font-size: 0.92rem;
    margin: 0 0 36px;
  }

  section {
    background: #fffcf5;
    border-radius: 22px;
    padding: 24px 26px;
    margin-bottom: 16px;
    box-shadow: 0 8px 10px -6px rgba(120, 52, 30, 0.12);
  }

  h2 {
    font-family: "Baloo 2", sans-serif;
    font-weight: 700;
    font-size: 1.2rem;
    margin: 0 0 8px;
  }

  p {
    color: #96705e;
    line-height: 1.65;
    margin: 0;
  }

  section :global(a) {
    color: #c33f2e;
    font-weight: 600;
  }

  .back {
    margin-top: 40px;
    text-align: center;
  }
  .back a {
    color: #96705e;
    text-decoration: none;
  }
  .back a:hover {
    color: #c33f2e;
  }
</style>
