const COOKIE = 'parolaDaily';

/** A second local record keeps today's result when only localStorage is cleared. */
export function readParolaCookie(): unknown {
	if (typeof document === 'undefined') return null;
	try {
		const value = document.cookie.split('; ').find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
		return value === undefined ? null : JSON.parse(decodeURIComponent(value));
	} catch { return null; }
}

export function writeParolaCookie(state: { readonly date: string; readonly guesses: readonly { readonly word: string }[] }): void {
	if (typeof document === 'undefined') return;
	try {
		const value = encodeURIComponent(JSON.stringify({ date: state.date, guesses: state.guesses.map(({ word }) => ({ word })) }));
		document.cookie = `${COOKIE}=${value}; Path=/; Max-Age=172800; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
	} catch { /* Storage may be disabled; the primary save remains available. */ }
}
