import type { DailyPuzzleKey } from './types';

export const CATALOG_CONTENT_SCHEMA_VERSION = 1;

export type ThemeSeed = {
	readonly themeId: string;
	readonly label: string;
	readonly explanation: string;
	readonly distractors: readonly [string, string, string];
	readonly puzzleWords: Record<DailyPuzzleKey, readonly [string, string, string]>;
};

export const THEMES = [
	{
		themeId: 'theme-mercato',
		label: 'Mercato italiano',
		explanation: 'Tutte le parole richiamano banchi, prodotti e gesti tipici del mercato.',
		distractors: ['Cinema classico', 'Montagna innevata', 'Viaggio spaziale'],
		puzzleWords: {
			parola: ['BANCO', 'PREZZO', 'SPESA'],
			caccia: ['FRUTTA', 'PANE', 'BANCARELLA'],
			paroliere: ['MERCATO', 'VENDERE', 'CESTINO'],
			impiccato: ['POMODORO', 'FORMAGGIO', 'SALUMI'],
			anagrammi: ['MONETE', 'SCONTO', 'CLIENTE'],
		},
	},
	{
		themeId: 'theme-mare',
		label: 'Estate al mare',
		explanation: 'La sfida raccoglie parole da spiaggia, onde, sole e vacanze.',
		distractors: ['Biblioteca antica', 'Officina meccanica', 'Teatro lirico'],
		puzzleWords: {
			parola: ['ONDA', 'SABBIA', 'SOLE'],
			caccia: ['OMBRELLONE', 'CONCHIGLIA', 'BAGNO'],
			paroliere: ['MAREA', 'VELIERO', 'PORTO'],
			impiccato: ['BAGNINO', 'COSTUME', 'TRAMONTO'],
			anagrammi: ['MARINO', 'SPIAGGIA', 'VACANZA'],
		},
	},
	{
		themeId: 'theme-cucina',
		label: 'Cucina di casa',
		explanation: 'Ingredienti, utensili e profumi domestici legano ogni puzzle.',
		distractors: ['Stazione ferroviaria', 'Giardino segreto', 'Laboratorio chimico'],
		puzzleWords: {
			parola: ['PASTA', 'FORNO', 'SUGO'],
			caccia: ['MESTOLO', 'RICETTA', 'TAGLIERE'],
			paroliere: ['BASILICO', 'PENTOLA', 'FARINA'],
			impiccato: ['CROSTATA', 'RISOTTO', 'COLTELLO'],
			anagrammi: ['SAPORE', 'TEGAME', 'CUCINA'],
		},
	},
	{
		themeId: 'theme-scuola',
		label: 'Giornata di scuola',
		explanation: 'Ogni parola rimanda a lezioni, quaderni e vita in classe.',
		distractors: ['Foresta tropicale', 'Partita allo stadio', 'Mercato notturno'],
		puzzleWords: {
			parola: ['BANCO', 'LIBRO', 'VOTO'],
			caccia: ['QUADERNO', 'LAVAGNA', 'COMPITO'],
			paroliere: ['MATITA', 'LEZIONE', 'CARTELLA'],
			impiccato: ['INTERVALLO', 'MAESTRA', 'DIARIO'],
			anagrammi: ['CLASSE', 'SCUOLA', 'STUDIO'],
		},
	},
	{
		themeId: 'theme-viaggio',
		label: 'Viaggio in treno',
		explanation: 'Binari, partenze e biglietti costruiscono il filo comune.',
		distractors: ['Cena in famiglia', 'Museo egizio', 'Campo di grano'],
		puzzleWords: {
			parola: ['TRENO', 'BINARIO', 'POSTO'],
			caccia: ['VALIGIA', 'STAZIONE', 'BIGLIETTO'],
			paroliere: ['PARTENZA', 'RITARDO', 'CARROZZA'],
			impiccato: ['CAPOTRENO', 'FERMATA', 'VIAGGIO'],
			anagrammi: ['ORARIO', 'ANDATA', 'RITORNO'],
		},
	},
	{
		themeId: 'theme-musica',
		label: 'Musica e ritmo',
		explanation: 'Strumenti, note e palco fanno da tema nascosto della sfida.',
		distractors: ['Pesca sul lago', 'Cantiere urbano', 'Cucina rustica'],
		puzzleWords: {
			parola: ['NOTA', 'RITMO', 'CORO'],
			caccia: ['CHITARRA', 'PIANOFORTE', 'TAMBURO'],
			paroliere: ['MELODIA', 'CONCERTO', 'ARPEGGIO'],
			impiccato: ['ORCHESTRA', 'CANTANTE', 'SPARTITO'],
			anagrammi: ['SUONO', 'PALCO', 'CANZONE'],
		},
	},
] as const satisfies readonly ThemeSeed[];
