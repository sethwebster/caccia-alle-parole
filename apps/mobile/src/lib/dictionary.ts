import { FORM_BLOB } from '@/data/dictionary-forms';
import { LEMMA_BLOB } from '@/data/dictionary-lemmas';

/**
 * The one dictionary every game draws from. Wiktionary supplies both the
 * wordlist and the definitions, so any word this accepts can also be explained
 * — validation and meaning can never disagree.
 */
export type WordMeaning = {
	/** The lemma as Italian spells it, accents intact: PERO resolves to "però". */
	readonly lemma: string;
	readonly pos: string;
	readonly english: string;
	/** Empty for the ~54% of lemmas it.wiktionary does not cover. */
	readonly italian: string;
};

/** Uppercase + strip accents, so unaccented board letters match accented headwords. */
export function normalizeWord(word: string): string {
	return word
		.normalize('NFD')
		.toUpperCase()
		.replace(/[^A-Z]/g, '');
}

// Both blobs stay as single strings until a game actually needs them: the index
// costs ~260k Map entries, and app launch should not pay for a board nobody opened.
let formIndex: Map<string, number> | null = null;
let lemmaLines: string[] | null = null;

/** Line i of FORM_BLOB holds lemma i's forms, front-coded against the previous form. */
function decodeForms(line: string, lemma: number, into: Map<string, number>): void {
	let previous = '';
	for (const token of line.split(' ')) {
		const form = previous.slice(0, token.charCodeAt(0) - 48) + token.slice(1);
		into.set(form, lemma);
		previous = form;
	}
}

function index(): Map<string, number> {
	if (formIndex === null) {
		const map = new Map<string, number>();
		const lines = FORM_BLOB.split('\n');
		for (let i = 0; i < lines.length; i += 1) decodeForms(lines[i], i, map);
		formIndex = map;
	}
	return formIndex;
}

export function isValidWord(word: string): boolean {
	return index().has(normalizeWord(word));
}

/** The meaning behind a found word — the lemma, so PARLIAMO explains itself through "parlare". */
export function lookupWord(word: string): WordMeaning | null {
	const lemma = index().get(normalizeWord(word));
	if (lemma === undefined) return null;
	lemmaLines ??= LEMMA_BLOB.split('\n');
	const [display = '', pos = '', english = '', italian = ''] = lemmaLines[lemma].split('|');
	return { lemma: display, pos, english, italian };
}
