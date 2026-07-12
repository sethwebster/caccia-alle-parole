import { StatPill } from '@caccia/mobile';

/** Score row as it appears above a game board. */
export const RigaPunteggi = () => (
  <div
    style={{
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      padding: 20,
      background: '#F8EFE2',
      borderRadius: 22,
    }}
  >
    <StatPill label="Punteggio" value={1240} tone="accent" />
    <StatPill label="Parole" value="18/20" />
    <StatPill label="Tempo" value="0:42" tone="warning" />
  </div>
);

export const Toni = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
    <StatPill label="Serie" value={5} />
    <StatPill label="Record" value={2310} tone="accent" />
    <StatPill label="Errori" value={2} tone="warning" />
  </div>
);
