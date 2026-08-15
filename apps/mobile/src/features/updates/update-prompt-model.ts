/** Italian, matching the rest of the app chrome. */
export const UPDATE_PROMPT_COPY = {
	ready: {
		icon: '✨',
		title: 'Aggiornamento pronto',
		message: 'Una nuova versione è già scaricata. Riavvia per usarla subito.',
		primary: 'Riavvia ora',
		secondary: 'Più tardi',
	},
	available: {
		icon: '⬇️',
		title: 'Aggiornamento disponibile',
		message: 'Scarichiamo la nuova versione e riavviamo l’app.',
		primary: 'Scarica e riavvia',
		secondary: 'Più tardi',
	},
	downloading: {
		icon: '⏳',
		title: 'Download in corso',
		message: 'Stiamo scaricando l’aggiornamento. Ci vuole un attimo.',
		primary: 'Attendi…',
	},
	failed: {
		icon: '⚠️',
		title: 'Aggiornamento non riuscito',
		message: 'Non siamo riusciti a scaricare la nuova versione. I tuoi progressi restano al sicuro.',
		primary: 'Riprova',
		secondary: 'Chiudi',
	},
} as const;

export const UPDATE_CHECK_COPY = {
	overline: 'APP',
	title: 'Aggiornamenti',
	action: 'Controlla aggiornamenti',
	checking: 'Controllo in corso…',
	upToDate: 'Sei già aggiornato.',
	found: 'Aggiornamento trovato.',
	failed: 'Controllo non riuscito. Riprova più tardi.',
} as const;

export type UpdateCheckStatus = 'idle' | 'checking' | 'upToDate' | 'found' | 'failed';

export type UpdateCheckPhase = 'idle' | 'checking' | 'checked' | 'failed';

/**
 * Reads the outcome from live state rather than the check's own return value.
 * checkForUpdateAsync reports nothing new once a bundle has already been
 * downloaded, so trusting it alone would answer "sei già aggiornato" while an
 * update sits waiting to be applied.
 */
export function updateCheckStatus(input: { readonly phase: UpdateCheckPhase; readonly isUpdateAvailable: boolean; readonly isUpdatePending: boolean }): UpdateCheckStatus {
	if (input.phase === 'checking') return 'checking';
	if (input.phase === 'failed') return 'failed';
	if (input.isUpdatePending || input.isUpdateAvailable) return 'found';
	return input.phase === 'checked' ? 'upToDate' : 'idle';
}

export type UpdateCheckModel = {
	readonly label: string;
	readonly caption?: string;
	readonly busy: boolean;
};

/** Drives the Profile row: one button plus a line saying how the last check went. */
export function selectUpdateCheck(status: UpdateCheckStatus): UpdateCheckModel {
	switch (status) {
		case 'checking':
			return { label: UPDATE_CHECK_COPY.checking, busy: true };
		case 'upToDate':
			return { label: UPDATE_CHECK_COPY.action, caption: UPDATE_CHECK_COPY.upToDate, busy: false };
		case 'found':
			return { label: UPDATE_CHECK_COPY.action, caption: UPDATE_CHECK_COPY.found, busy: false };
		case 'failed':
			return { label: UPDATE_CHECK_COPY.action, caption: UPDATE_CHECK_COPY.failed, busy: false };
		case 'idle':
			return { label: UPDATE_CHECK_COPY.action, busy: false };
	}
}

export type UpdatePromptAction = 'restart' | 'download' | 'none';

export type UpdatePromptModel = {
	readonly visible: boolean;
	readonly icon: string;
	readonly title: string;
	readonly message: string;
	readonly primaryLabel: string;
	readonly secondaryLabel?: string;
	readonly primaryAction: UpdatePromptAction;
	/** False while a download is in flight, so the card cannot be tapped away mid-fetch. */
	readonly dismissible: boolean;
};

const HIDDEN: UpdatePromptModel = { visible: false, icon: '', title: '', message: '', primaryLabel: '', primaryAction: 'none', dismissible: true };

export type UpdatePromptState = {
	/** expo-updates is compiled in and not running under a dev server. */
	readonly enabled: boolean;
	/** An update is downloaded and waiting for the next launch. */
	readonly isUpdatePending: boolean;
	readonly isUpdateAvailable: boolean;
	readonly isDownloading: boolean;
	readonly isRestarting: boolean;
	/** The player chose "Più tardi" for the update currently on offer. */
	readonly dismissed: boolean;
	readonly failed: boolean;
};

/**
 * Chooses what the prompt shows. expo-updates downloads a new bundle in the
 * background on launch and applies it only on the next cold start, so the common
 * case is an already-pending update the player can take right now with no wait.
 */
export function selectUpdatePrompt(state: UpdatePromptState): UpdatePromptModel {
	if (!state.enabled || state.isRestarting) return HIDDEN;
	if (state.isDownloading) return { ...UPDATE_PROMPT_COPY.downloading, visible: true, message: UPDATE_PROMPT_COPY.downloading.message, primaryLabel: UPDATE_PROMPT_COPY.downloading.primary, primaryAction: 'none', dismissible: false };
	if (state.failed) return promptFrom('failed', 'download', state.dismissed);
	if (state.isUpdatePending) return promptFrom('ready', 'restart', state.dismissed);
	if (state.isUpdateAvailable) return promptFrom('available', 'download', state.dismissed);
	return HIDDEN;
}

function promptFrom(key: 'ready' | 'available' | 'failed', primaryAction: UpdatePromptAction, dismissed: boolean): UpdatePromptModel {
	if (dismissed) return HIDDEN;
	const copy = UPDATE_PROMPT_COPY[key];
	return {
		visible: true,
		icon: copy.icon,
		title: copy.title,
		message: copy.message,
		primaryLabel: copy.primary,
		secondaryLabel: copy.secondary,
		primaryAction,
		dismissible: true,
	};
}

/**
 * Identifies the update on offer so "Più tardi" sticks to that one update and a
 * later one still prompts. Always resolves to a key — a prompt with no id behind
 * it must stay dismissible, so it falls back to the state it was raised from.
 */
export function updateOfferKey(input: { readonly availableUpdateId?: string; readonly downloadedUpdateId?: string; readonly isUpdatePending: boolean }): string {
	return input.downloadedUpdateId ?? input.availableUpdateId ?? (input.isUpdatePending ? 'pending' : 'available');
}
