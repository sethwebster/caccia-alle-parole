import { GameHeader } from '@caccia/mobile';

/** Full game-screen header: back button, title + subtitle, new-game action. */
export const IntestazioneCompleta = () => (
	<div style={{ width: 400, padding: '12px 0', background: '#F8EFE2', borderRadius: 22 }}>
		<GameHeader
			title="Paroliere"
			subtitle="Sfida del giorno"
			actionLabel="↺"
			actionAccessibilityLabel="Nuova partita"
			onAction={() => {}}
		/>
	</div>
);

/** Title only — no subtitle, no right action (spacer keeps the title centered). */
export const SoloTitolo = () => (
	<div style={{ width: 400, padding: '12px 0', background: '#F8EFE2', borderRadius: 22 }}>
		<GameHeader title="Impiccato" />
	</div>
);
