/**
 * The daily challenge promises everyone the same words on the same day. The
 * grid is a pure function of the challenge ID, so content already holds — but
 * which words *score* is decided by the dictionary bundled in the running
 * build. A player one release behind sees the same board under different rules.
 *
 * A build cannot tell it is stale from bundled data alone (its own catalog
 * stamps its own dictionaryVersion), so the only honest signal is expo-updates:
 * if a newer build exists, official play waits for it. Replay and archive are
 * deliberately left open — revisiting an old day with a better dictionary is a
 * feature, not a fairness problem.
 */
export type OfficialAttemptGate =
	| { readonly kind: 'open' }
	| {
			readonly kind: 'blocked';
			readonly title: string;
			readonly message: string;
			readonly primaryLabel: string;
			/** 'none' while the update is already in flight — there is nothing left to tap. */
			readonly action: 'restart' | 'download' | 'none';
	  };

export const OFFICIAL_GATE_COPY = {
	pending: {
		title: 'Aggiornamento pronto',
		message: 'La sfida di oggi usa il dizionario più recente. Riavvia per giocare la partita ufficiale con le stesse parole di tutti.',
		primary: 'Riavvia ora',
	},
	available: {
		title: 'Aggiornamento necessario',
		message: 'È disponibile una nuova versione. Scaricala per giocare la sfida ufficiale con le stesse parole di tutti.',
		primary: 'Scarica',
	},
	working: {
		title: 'Aggiornamento in corso',
		message: 'Ancora un momento e la sfida di oggi sarà allineata a quella di tutti gli altri.',
		primary: 'Attendi…',
	},
} as const;

export type OfficialAttemptGateState = {
	/** Official play is only gated where updates exist: never in dev or a bare build. */
	readonly enabled: boolean;
	readonly mode: 'official' | 'replay';
	readonly isUpdateAvailable: boolean;
	readonly isUpdatePending: boolean;
	readonly isDownloading: boolean;
	readonly isRestarting: boolean;
};

const OPEN: OfficialAttemptGate = { kind: 'open' };

export function selectOfficialAttemptGate(state: OfficialAttemptGateState): OfficialAttemptGate {
	if (!state.enabled || state.mode === 'replay') return OPEN;
	if (state.isDownloading || state.isRestarting) return blocked('working', 'none');
	if (state.isUpdatePending) return blocked('pending', 'restart');
	if (state.isUpdateAvailable) return blocked('available', 'download');
	return OPEN;
}

function blocked(key: keyof typeof OFFICIAL_GATE_COPY, action: 'restart' | 'download' | 'none'): OfficialAttemptGate {
	const copy = OFFICIAL_GATE_COPY[key];
	return { kind: 'blocked', title: copy.title, message: copy.message, primaryLabel: copy.primary, action };
}
