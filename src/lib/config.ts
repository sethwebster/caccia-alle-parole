import { redirect } from '@sveltejs/kit';

/**
 * Landing-page mode: the site now markets the iOS app.
 * Flip to true to bring the playable web games back (routes and code are intact).
 */
export const GAMES_ENABLED = false;

/** Set when the app goes live, e.g. 'https://apps.apple.com/it/app/caccia-parole/id0000000000' */
export const APP_STORE_URL: string | null = null;

/** Game routes call this from +page.ts; redirects home while games are hidden. */
export function guardGameRoute(): void {
	if (!GAMES_ENABLED) redirect(307, '/');
}
