import { ThemedText, ThemedView } from '@caccia/mobile';

/** Page background with a nested element surface — the standard shell nesting. */
export const SuperficiAnnidate = () => (
	<div style={{ width: 380 }}>
		<ThemedView style={{ padding: 20, borderRadius: 16, gap: 12 }}>
			<ThemedText type="subtitle">Impostazioni</ThemedText>
			<ThemedView type="backgroundElement" style={{ padding: 16, borderRadius: 12, gap: 4 }}>
				<ThemedText type="smallBold">Notifiche giornaliere</ThemedText>
				<ThemedText type="small">Ricevi un promemoria per la sfida del giorno.</ThemedText>
			</ThemedView>
			<ThemedView type="backgroundSelected" style={{ padding: 16, borderRadius: 12 }}>
				<ThemedText type="smallBold">Lingua: Italiano</ThemedText>
			</ThemedView>
		</ThemedView>
	</div>
);

/** All three surface types side by side, on a contrasting backdrop. */
export const TipiSuperficie = () => (
	<div style={{ width: 380, padding: 16, background: '#F8F8FA', borderRadius: 16 }}>
		<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
			<ThemedView
				style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#D9DBE0' }}
			>
				<ThemedText type="smallBold">background — pagina</ThemedText>
			</ThemedView>
			<ThemedView
				type="backgroundElement"
				style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#D9DBE0' }}
			>
				<ThemedText type="smallBold">backgroundElement — riga elenco</ThemedText>
			</ThemedView>
			<ThemedView
				type="backgroundSelected"
				style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#D9DBE0' }}
			>
				<ThemedText type="smallBold">backgroundSelected — voce attiva</ThemedText>
			</ThemedView>
		</div>
	</div>
);
