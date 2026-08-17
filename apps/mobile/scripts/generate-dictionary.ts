import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { open, writeFile } from 'node:fs/promises';
import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { createInterface } from 'node:readline';
import { createReadStream } from 'node:fs';

/**
 * Builds the canonical Italian dictionary every game draws from.
 *
 * Source: Wiktionary via kaikki.org (wiktextract), CC BY-SA 4.0.
 *   - en.wiktionary Italian entries -> English glosses + form/lemma structure
 *   - it.wiktionary                 -> Italian glosses
 *
 * Wiktionary supplies BOTH the wordlist and the definitions, so every playable
 * word is defined by construction — there is no undefined tail to apologize for.
 *
 * Run with `bun run generate:dictionary`. Downloads ~765MB to .cache/ on first
 * run and reuses it after.
 */
const EN_URL = 'https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.jsonl';
const IT_URL = 'https://kaikki.org/itwiktionary/raw-wiktextract-data.jsonl.gz';

/**
 * The lexicon is shared, so it carries every form and lets each game impose its
 * own limits — Paroliere traces at most 10 letters, but Impiccato and Anagrammi
 * use words like PALCOSCENICO. 16 covers the longest word any game ships
 * (stendibiancheria); capping at a board-sized 10 silently starved them.
 */
const MIN_FORM = 3;
const MAX_FORM = 16;

const CACHE = new URL('../.cache/', import.meta.url);

type Entry = { display: string; pos: string; en: string; it: string; forms: Set<string> };

function normalize(value: string): string {
	return value
		.normalize('NFD')
		.toUpperCase()
		.replace(/[^A-Z]/g, '');
}

async function cached(url: string, name: string): Promise<string> {
	mkdirSync(CACHE, { recursive: true });
	const target = new URL(name, CACHE);
	if (existsSync(target) && statSync(target).size > 1_000_000) return target.pathname;
	console.log(`downloading ${name}...`);
	const response = await fetch(url);
	if (!response.ok || response.body === null) throw new Error(`${name} responded ${response.status}`);
	await new Promise<void>((resolve, reject) => {
		const out = createWriteStream(target);
		Readable.fromWeb(response.body as never).pipe(out).on('finish', resolve).on('error', reject);
	});
	return target.pathname;
}

async function* lines(path: string, gzipped: boolean): AsyncGenerator<string> {
	const stream = gzipped ? createReadStream(path).pipe(createGunzip()) : createReadStream(path);
	for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) yield line;
}

const lemmas = new Map<string, Entry>();
const formOf = new Map<string, string>();

// Pass 1: en.wiktionary gives the English gloss for lemmas and, via `form_of`,
// the inflection -> lemma structure that keeps definitions off individual forms.
for await (const line of lines(await cached(EN_URL, 'en-italian.jsonl'), false)) {
	if (line.length === 0) continue;
	const record = JSON.parse(line) as Record<string, any>;
	if (record.lang_code !== 'it' || record.pos === 'name') continue;
	const word = record.word as string | undefined;
	if (!word || /[\s'-]/.test(word)) continue;
	const key = normalize(word);
	if (key.length === 0) continue;
	const sense = (record.senses as Record<string, any>[] | undefined)?.find((s) => (s.glosses as string[] | undefined)?.length);
	if (sense === undefined) continue;
	const base = (sense.form_of as { word: string }[] | undefined)?.[0]?.word;
	if ((sense.tags as string[] | undefined)?.includes('form-of') && base !== undefined) {
		// Auxiliaries come through as "avere and" (wiktextract keeps the conjunction
		// from "avere and essere"), which normalizes to a lemma that does not exist —
		// silently dropping HO, HA and HANNO. Keep only the headword.
		const baseKey = normalize(base.split(/\s+/)[0]);
		if (baseKey.length > 0 && baseKey !== key && !formOf.has(key)) formOf.set(key, baseKey);
	} else if (!lemmas.has(key)) {
		lemmas.set(key, { display: word, pos: record.pos ?? '', en: (sense.glosses as string[])[0], it: '', forms: new Set() });
	}
}
console.log(`lemmas ${lemmas.size.toLocaleString()}  inflections ${formOf.size.toLocaleString()}`);

// Pass 2: it.wiktionary glosses. Its output carries template residue
// ("casa ( approfondimento) f sing"), so anything that is really a headword
// echo or a cross-reference stub is dropped rather than shown to a learner.
const RESIDUE = /\(\s*(approfondimento|citazioni|vedi|voce)\s*\)/i;
for await (const line of lines(await cached(IT_URL, 'it-wiktionary.jsonl.gz'), true)) {
	if (line.length === 0) continue;
	let record: Record<string, any>;
	try {
		record = JSON.parse(line);
	} catch {
		continue;
	}
	if (record.lang_code !== 'it') continue;
	const word = record.word as string | undefined;
	if (!word || /[\s'-]/.test(word)) continue;
	const entry = lemmas.get(normalize(word));
	if (entry === undefined || entry.it.length > 0) continue;
	for (const sense of (record.senses as Record<string, any>[] | undefined) ?? []) {
		const gloss = ((sense.glosses as string[] | undefined) ?? []).map((g) => g.trim()).find((g) => g.length >= 8 && !RESIDUE.test(g) && !g.toLowerCase().startsWith(word.toLowerCase()));
		if (gloss !== undefined) {
			entry.it = gloss;
			break;
		}
	}
}

// Attach playable forms to their lemma. A lemma short enough to trace is a form of itself.
for (const [form, base] of formOf) {
	if (form.length < MIN_FORM || form.length > MAX_FORM) continue;
	lemmas.get(base)?.forms.add(form);
}
for (const [key, entry] of lemmas) {
	if (key.length >= MIN_FORM && key.length <= MAX_FORM) entry.forms.add(key);
}

const kept = [...lemmas.entries()].filter(([, e]) => e.forms.size > 0).sort(([a], [b]) => (a < b ? -1 : 1));

/** Forms of one lemma share long prefixes, so front-coding within the group beats a global sort — and grouping removes the per-form lemma pointer entirely. */
function frontCode(forms: string[]): string {
	let previous = '';
	return forms
		.map((form) => {
			let shared = 0;
			while (shared < Math.min(form.length, previous.length, 35) && form[shared] === previous[shared]) shared += 1;
			previous = form;
			return String.fromCharCode(48 + shared) + form.slice(shared);
		})
		.join(' ');
}

const lemmaBlob = kept.map(([, e]) => `${e.display}|${e.pos}|${e.en.replace(/[|\n]/g, ' ')}|${e.it.replace(/[|\n]/g, ' ')}`).join('\n');
const formBlob = kept.map(([, e]) => frontCode([...e.forms].sort())).join('\n');
const forms = kept.reduce((total, [, e]) => total + e.forms.size, 0);
const withIt = kept.filter(([, e]) => e.it.length > 0).length;

const header = (what: string) => `// GENERATED by scripts/generate-dictionary.ts — do not edit by hand.
// ${what}
// Source: Wiktionary via kaikki.org (wiktextract), CC BY-SA 4.0.
// ${kept.length.toLocaleString('en-US')} lemmas, ${forms.toLocaleString('en-US')} playable forms.
`;

await writeFile(
	new URL('../src/data/dictionary-lemmas.ts', import.meta.url),
	`${header('One line per lemma: display|pos|english|italian (italian may be empty).')}
export const LEMMA_BLOB = \`${lemmaBlob}\`;
`,
);
await writeFile(
	new URL('../src/data/dictionary-forms.ts', import.meta.url),
	`${header('Line i holds the playable forms of lemma i, front-coded: a shared-prefix length (as char code 48+n) then the suffix.')}
export const FORM_BLOB = \`${formBlob}\`;
`,
);

console.log(`wrote ${kept.length.toLocaleString()} lemmas / ${forms.toLocaleString()} forms`);
console.log(`italian glosses on ${withIt.toLocaleString()} lemmas (${((withIt / kept.length) * 100).toFixed(1)}%)`);
