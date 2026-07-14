import type { TerminalReason } from './types';

export type DailyStateTone = 'loading' | 'warning' | 'error';

export type DailyStateCopy = {
	readonly eyebrow: string;
	readonly title: string;
	readonly message: string;
	readonly detail: string;
	readonly tone: DailyStateTone;
};

export type DailyPuzzleStatusTone = 'idle' | 'active' | 'done' | 'lost';

export const DAILY_COPY = {
	state: {
		loading: { eyebrow: 'RITO DEL GIORNO', title: 'Prepariamo la sfida', message: 'Stiamo caricando catalogo e progressi locali.', detail: 'Resta qui: i cinque giochi stanno per arrivare.', tone: 'loading' },
			loadError: { eyebrow: 'CARICAMENTO SFIDA', title: 'Sfida non caricata', message: 'Non siamo riusciti a caricare la Sfida Giornaliera su questo dispositivo.', detail: 'Chiudi e riapri l’app: i progressi ufficiali restano protetti.', tone: 'error' },
		archiveLoading: { eyebrow: 'ARCHIVIO LOCALE', title: 'Archivio Sfide', message: 'Caricamento della cronologia salvata sul dispositivo.', detail: 'Nessun account e nessuna classifica globale.', tone: 'loading' },
		archiveEmpty: { eyebrow: 'ARCHIVIO LOCALE', title: 'Nessuna sfida archiviata', message: 'Completa la Sfida Giornaliera o torna domani per vedere le giornate passate.', detail: 'Le voci appariranno qui appena saranno disponibili per il replay.', tone: 'warning' },
	},
	route: {
		headerSubtitle: 'Rito quotidiano',
		giveUp: 'Abbandona',
		resultOverline: 'RISULTATO',
		catalogOverline: 'CATALOGO SFIDA',
		stats: { streak: 'Serie attuale', completed: 'Sfide concluse', perfect: 'Perfette' },
		catalogMeta: { version: 'Versione', source: 'Origine', window: 'Periodo' },
	},
	puzzleStatus: {
		win: { label: 'Vinto', tone: 'done' },
		loss: { label: 'Chiuso', tone: 'lost' },
		skip: { label: 'Saltato', tone: 'lost' },
		giveUp: { label: 'Abbandonato', tone: 'lost' },
		next: { label: 'Prossimo', tone: 'active' },
		idle: { label: 'Da fare', tone: 'idle' },
		active: { label: 'In corso', tone: 'active' },
	} satisfies Record<TerminalReason | 'next' | 'idle' | 'active', { readonly label: string; readonly tone: DailyPuzzleStatusTone }>,
	action: {
		resume: 'Riprendi puzzle',
		replayFirst: 'Rigioca dal primo puzzle',
		replayStart: 'Inizia replay',
		replayDone: 'Replay completato',
		officialDone: 'Sfida completata',
		start: 'Inizia primo puzzle',
		continue: 'Continua la sfida',
	},
	phase: {
		notStarted: 'Cinque giochi, un tema nascosto: inizia quando vuoi.',
		inProgress: 'Sfida ufficiale in corso. Il prossimo gioco è già pronto.',
		completedOfficial: 'Ufficiale completata. Risultato, tema e replay restano salvati qui.',
		replay: 'Replay locale: puoi rigiocare senza modificare il risultato ufficiale.',
	},
	theme: {
		lockedOverline: 'TEMA BLOCCATO',
		quizOverline: 'QUIZ TEMA',
		lockedTitle: 'Tema nascosto custodito',
		lockedBody: 'Completa tutti e cinque i giochi per sbloccare il filo comune di oggi.',
		unansweredTitle: 'Indovina il tema nascosto',
		unansweredBody: 'Hai concluso la sfida: scegli con calma il legame che univa i giochi.',
			revealChoices: 'Mostra le risposte',
		answeredTitle: 'Tema svelato',
		correctBody: 'Scelta perfetta: hai riconosciuto il filo comune.',
		incorrectBody: 'Risposta salvata: ecco il filo comune corretto.',
		correctFeedback: 'Risposta esatta',
		incorrectFeedback: 'Tema corretto',
		selectedPrefix: 'Hai scelto',
		correctPrefix: 'Soluzione',
	},
		share: {
		lockedTitle: 'Condivisione bloccata',
		lockedBody: 'Completa i cinque giochi ufficiali per generare un riepilogo senza spoiler.',
		lockedButton: 'Completa la sfida',
		officialTitle: 'Riepilogo ufficiale',
		replayTitle: 'Riepilogo replay',
		button: 'Condividi risultato',
			publicTitle: 'Sfida Giornaliera',
			open: 'Apri la sfida',
			streak: 'Serie',
			themeCorrect: 'Quiz tema: esatto',
			themeIncorrect: 'Quiz tema: risposta salvata',
		},
	archive: {
		title: 'Archivio Sfide',
		headerSubtitle: 'Cronologia locale',
		overline: 'ARCHIVIO LOCALE',
		localOnlyCaveat: 'Cronologia salvata solo su questo dispositivo: niente account, server o classifica globale.',
		status: { completed: 'Ufficiale completata', replayOnly: 'Replay locali', playing: 'Ufficiale in corso', today: 'Sfida di oggi', missed: 'Mancata' },
		replay: { completed: 'Rigioca in replay', missed: 'Gioca in replay', locked: 'Disponibile dopo la sfida', premium: 'Sblocca con Premium', countLabel: 'Replay' },
		official: { none: 'Nessun risultato ufficiale', completed: 'Primo risultato ufficiale bloccato', playing: 'Ufficiale non completata' },
		meta: { source: 'Origine', catalog: 'Catalogo' },
	},
	abandon: {
		title: 'Abbandonare il gioco?',
		message: 'Chiude il tentativo ufficiale di oggi per questo gioco: non potrai rigiocarlo nella sfida.',
		cancel: 'Annulla',
		confirm: 'Abbandona',
	},
	challenge: { returnToHub: 'Torna alla Sfida' },
	catalog: { title: 'Catalogo deterministico', installed: 'Catalogo incluso', localCopy: 'Copia locale salvata', preview: 'Anteprima generata', available: 'Disponibile', requiresLocalCopy: 'Serve una copia locale' },
	replayBadge: { active: 'Replay locale attivo', savedSingular: '1 replay locale salvato' },
} as const;
