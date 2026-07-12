import { ArchiveAccessCard } from '@caccia/mobile';

/** Default promo card as it appears on the daily tab. */
export const Standard = () => (
  <div style={{ padding: 20, background: '#F8EFE2', borderRadius: 22, width: 360 }}>
    <ArchiveAccessCard />
  </div>
);

/** Compact variant used in tighter layouts (profile tab). */
export const Compatta = () => (
  <div style={{ padding: 20, background: '#F8EFE2', borderRadius: 22, width: 360 }}>
    <ArchiveAccessCard compact />
  </div>
);
