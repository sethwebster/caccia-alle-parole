import { ResultModal, ResultStat } from '@caccia/mobile';

/** End-of-game win state with the stats block and both actions. */
export const Vittoria = () => (
  <ResultModal
    visible
    icon="🎉"
    title="Vittoria!"
    message="Hai trovato tutte le parole del giorno."
    primaryLabel="Gioca ancora"
    onPrimary={() => {}}
    secondaryLabel="Torna al menu"
    onSecondary={() => {}}
    onDismiss={() => {}}
  >
    <ResultStat label="Punteggio" value={1240} accent />
    <ResultStat label="Parole trovate" value="18/20" />
    <ResultStat label="Serie giornaliera" value={5} />
  </ResultModal>
);

/** Loss state — no secondary action, message only. */
export const TempoScaduto = () => (
  <ResultModal
    visible
    icon="⏳"
    title="Tempo scaduto"
    message="La parola era BASILICO. Riprova domani!"
    primaryLabel="Rivedi la partita"
    onPrimary={() => {}}
    onDismiss={() => {}}
  />
);
