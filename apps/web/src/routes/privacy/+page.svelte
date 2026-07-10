<script lang="ts">
  import ObfuscatedEmail from "$lib/components/ui/ObfuscatedEmail.svelte";
</script>

<svelte:head>
  <title>Informativa Privacy — Caccia Paròle</title>
  <meta name="description" content="Informativa sulla privacy dell'app Caccia Paròle: nessun account, nessun tracciamento, dati solo sul tuo dispositivo." />
</svelte:head>

<div class="privacy">
  <p class="overline">INFORMATIVA PRIVACY</p>
  <h1>La tua privacy, in breve: non raccogliamo niente.</h1>
  <p class="updated">Ultimo aggiornamento: 8 luglio 2026</p>

  <section>
    <h2>Nessun account, nessun server</h2>
    <p>
      Caccia Paròle non richiede registrazione e non ha server propri. Tutti i
      dati di gioco — progressi, punteggi, serie di vittorie, nome e immagine
      del profilo — sono salvati esclusivamente sul tuo dispositivo e non
      vengono mai trasmessi a noi né a terzi.
    </p>
  </section>

  <section>
    <h2>Accesso alle foto</h2>
    <p>
      L'app chiede accesso alla libreria fotografica solo quando scegli di
      impostare un'immagine del profilo, usando il selettore di sistema di iOS:
      vediamo unicamente la foto che selezioni, che viene copiata nello spazio
      privato dell'app sul tuo dispositivo. Puoi sostituirla in qualsiasi
      momento; disinstallando l'app viene eliminata.
    </p>
  </section>

  <section>
    <h2>Nessun tracciamento</h2>
    <p>
      L'app non contiene pubblicità, strumenti di analisi, SDK di terze parti a
      fini di marketing o profilazione, e non usa identificatori pubblicitari.
    </p>
  </section>

  <section>
    <h2>Eliminazione dei dati</h2>
    <p>
      Poiché tutti i dati risiedono sul tuo dispositivo, per eliminarli è
      sufficiente disinstallare l'app.
    </p>
  </section>

  <section>
    <h2>Contatti</h2>
    <p>
      Per qualsiasi domanda su questa informativa scrivi a
      <ObfuscatedEmail subject="Privacy Caccia Paròle" /> o visita la pagina di
      <a href="/supporto">supporto</a>.
    </p>
  </section>

  <p class="back"><a href="/">← Torna alla home</a></p>
</div>

<style>
  .privacy {
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

  /* :global so the link inside ObfuscatedEmail matches too */
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
