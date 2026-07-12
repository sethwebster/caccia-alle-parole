import { ThemedText } from '@caccia/mobile';

/** Full type scale (app-shell typography, light surface). */
export const ScalaTipografica = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: 20,
      background: '#ffffff',
      borderRadius: 16,
      maxWidth: 420,
    }}
  >
    <ThemedText type="title">Caccia alle Parole</ThemedText>
    <ThemedText type="subtitle">Sfida del giorno</ThemedText>
    <ThemedText>Trova tutte le parole nascoste nella griglia prima che scada il tempo.</ThemedText>
    <ThemedText type="small">Nuova sfida ogni giorno a mezzanotte.</ThemedText>
    <ThemedText type="smallBold">Serie attuale: 5 giorni</ThemedText>
    <ThemedText type="link">Vedi l'archivio delle sfide</ThemedText>
    <ThemedText type="linkPrimary">Inizia la partita</ThemedText>
    <ThemedText type="code">v2.0.1 · build 118</ThemedText>
  </div>
);

/** Theme colors: secondary text on the default surface. */
export const ColoriTema = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 20, background: '#ffffff', borderRadius: 16 }}>
    <ThemedText themeColor="text">Testo principale</ThemedText>
    <ThemedText themeColor="textSecondary">Testo secondario — descrizioni e didascalie</ThemedText>
  </div>
);
