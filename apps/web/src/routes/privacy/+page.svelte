<script lang="ts">
  import ObfuscatedEmail from "$lib/components/ui/ObfuscatedEmail.svelte";
</script>

<svelte:head>
  <title>Informativa Privacy — Caccia Paròle</title>
  <meta name="description" content="Informativa sulla privacy dell'app Caccia Paròle: nessun account, nessuna pubblicità, dati di gioco solo sul tuo dispositivo." />
</svelte:head>

<div class="privacy">
  <p class="overline">INFORMATIVA PRIVACY</p>
  <h1>La tua privacy, in breve: raccogliamo il minimo indispensabile.</h1>
  <p class="updated">Ultimo aggiornamento: 13 luglio 2026</p>

  <section>
    <h2>Nessun account</h2>
    <p>
      Caccia Paròle non richiede registrazione. Tutti i dati di gioco —
      progressi, punteggi, serie di vittorie, nome e immagine del profilo —
      sono salvati esclusivamente sul tuo dispositivo e non vengono trasmessi
      a noi né a terzi.
    </p>
  </section>

  <section>
    <h2>Notifiche push</h2>
    <p>
      Se attivi i promemoria della Sfida Giornaliera, salviamo sul nostro
      server (Cloudflare) il token di notifica del dispositivo insieme a un
      identificatore anonimo generato dall'app. Servono solo a inviarti i
      promemoria: non sono collegati a nome, email o altri dati personali e
      non vengono condivisi con terzi. Disattivando le notifiche o
      disinstallando l'app il token smette di essere usato; puoi chiederne la
      cancellazione scrivendoci.
    </p>
  </section>

  <section>
    <h2>Abbonamenti</h2>
    <p>
      Gli abbonamenti sono gestiti interamente da Apple tramite l'App Store.
      Non vediamo né conserviamo dati di pagamento: l'app verifica soltanto,
      tramite i servizi Apple, se un abbonamento è attivo sul dispositivo.
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
    <h2>Nessuna pubblicità né profilazione</h2>
    <p>
      L'app non contiene pubblicità, SDK di marketing o profilazione e non usa
      identificatori pubblicitari. Raccogliamo solo statistiche d'uso e
      diagnostica anonime (tramite i servizi Expo) per capire se l'app
      funziona correttamente; non sono collegate alla tua identità.
    </p>
  </section>

  <section>
    <h2>Eliminazione dei dati</h2>
    <p>
      I dati di gioco risiedono sul tuo dispositivo: per eliminarli è
      sufficiente disinstallare l'app. Per la cancellazione del token di
      notifica dal nostro server scrivici all'indirizzo qui sotto.
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
