export const LEGAL_URLS = {
	privacy: 'https://caccia-alle-parole.sethwebster.workers.dev/privacy',
	terms: 'https://caccia-alle-parole.sethwebster.workers.dev/termini',
	manageSubscriptions: 'https://apps.apple.com/account/subscriptions',
} as const;

export type PaywallLocale = 'it' | 'en';

export const PAYWALL_LOCALES: readonly { readonly locale: PaywallLocale; readonly label: string }[] = [
	{ locale: 'it', label: '🇮🇹 IT' },
	{ locale: 'en', label: '🇬🇧 EN' },
];

const PAYWALL_IT: PaywallCopy = {
	overline: 'CACCIA PAROLE PREMIUM',
	title: 'Sblocca la Sfida del Giorno',
	subtitle: 'Cinque giochi legati da un tema nascosto, ogni giorno. I giochi di pratica restano sempre gratuiti.',
	benefits: ['Sfida Giornaliera completa, ogni giorno', 'Archivio e replay delle sfide passate', 'Serie, statistiche e quiz del tema'],
	trialBadge: '7 giorni gratis',
	bestValueBadge: 'MIGLIOR PREZZO',
	period: { annual: 'all’anno', monthly: 'al mese' },
	planTitle: { annual: 'Annuale', monthly: 'Mensile' },
	subscribe: 'Inizia la prova gratuita',
	subscribeNoTrial: 'Abbonati',
	purchaseBusy: 'Acquisto in corso…',
	restore: 'Ripristina acquisti',
	restoreBusy: 'Ripristino in corso…',
	autoRenewDisclosure:
		'Abbonamento con rinnovo automatico. Dopo la prova gratuita di 7 giorni si rinnova al prezzo indicato, salvo disdetta almeno 24 ore prima della scadenza dalle impostazioni di App Store.',
	privacyLink: 'Informativa privacy',
	termsLink: 'Termini d’uso',
	close: 'Non ora',
	loadingProducts: 'Carichiamo le offerte…',
	error: {
		storeUnavailable: 'App Store non raggiungibile: riprova tra poco.',
		productsUnavailable: 'Offerte non disponibili al momento: riprova tra poco.',
		purchaseFailed: 'Acquisto non completato: nessun addebito effettuato.',
		restoreFailed: 'Nessun abbonamento attivo da ripristinare.',
	},
};

export type PaywallCopy = {
	readonly overline: string;
	readonly title: string;
	readonly subtitle: string;
	readonly benefits: readonly string[];
	readonly trialBadge: string;
	readonly bestValueBadge: string;
	readonly period: { readonly annual: string; readonly monthly: string };
	readonly planTitle: { readonly annual: string; readonly monthly: string };
	readonly subscribe: string;
	readonly subscribeNoTrial: string;
	readonly purchaseBusy: string;
	readonly restore: string;
	readonly restoreBusy: string;
	readonly autoRenewDisclosure: string;
	readonly privacyLink: string;
	readonly termsLink: string;
	readonly close: string;
	readonly loadingProducts: string;
	readonly error: {
		readonly storeUnavailable: string;
		readonly productsUnavailable: string;
		readonly purchaseFailed: string;
		readonly restoreFailed: string;
	};
};

const PAYWALL_EN: PaywallCopy = {
	overline: 'CACCIA PAROLE PREMIUM',
	title: 'Unlock the Daily Challenge',
	subtitle: 'Five games tied together by a hidden theme, every day. Practice games always stay free.',
	benefits: ['The full Daily Challenge, every day', 'Archive and replays of past challenges', 'Streaks, stats and the theme quiz'],
	trialBadge: '7 days free',
	bestValueBadge: 'BEST VALUE',
	period: { annual: 'per year', monthly: 'per month' },
	planTitle: { annual: 'Annual', monthly: 'Monthly' },
	subscribe: 'Start free trial',
	subscribeNoTrial: 'Subscribe',
	purchaseBusy: 'Processing purchase…',
	restore: 'Restore purchases',
	restoreBusy: 'Restoring…',
	autoRenewDisclosure:
		'Auto-renewing subscription. After the 7-day free trial it renews at the price shown unless cancelled at least 24 hours before the end of the period in your App Store settings.',
	privacyLink: 'Privacy policy',
	termsLink: 'Terms of use',
	close: 'Not now',
	loadingProducts: 'Loading offers…',
	error: {
		storeUnavailable: 'Can’t reach the App Store: try again shortly.',
		productsUnavailable: 'Offers unavailable right now: try again shortly.',
		purchaseFailed: 'Purchase not completed: you were not charged.',
		restoreFailed: 'No active subscription to restore.',
	},
};

export const PAYWALL_COPY: Record<PaywallLocale, PaywallCopy> = { it: PAYWALL_IT, en: PAYWALL_EN };

type GateCopy = {
	readonly eyebrow: string;
	readonly title: string;
	readonly message: string;
	readonly detail: string;
	readonly cta: string;
};

export const GATE_COPY: Record<PaywallLocale, GateCopy> = {
	it: {
		eyebrow: 'CACCIA PAROLE PREMIUM',
		title: 'La Sfida del Giorno è Premium',
		message: 'Abbonati per giocare la sfida ufficiale di oggi, l’archivio e i replay. I giochi di pratica restano gratuiti.',
		detail: 'Prova gratuita di 7 giorni, poi rinnovo automatico. Disdici quando vuoi da App Store.',
		cta: 'Sblocca la Sfida del Giorno',
	},
	en: {
		eyebrow: 'CACCIA PAROLE PREMIUM',
		title: 'The Daily Challenge is Premium',
		message: 'Subscribe to play today’s official challenge, the archive and replays. Practice games stay free.',
		detail: '7-day free trial, then auto-renews. Cancel anytime from the App Store.',
		cta: 'Unlock the Daily Challenge',
	},
};

export const SUBSCRIPTION_COPY = {
	profile: {
		overline: 'ABBONAMENTO',
		title: 'Caccia Parole Premium',
		statusActive: 'Premium attivo',
		statusInactive: 'Non attivo',
		statusUnknown: 'Verifica in corso…',
		subscribe: 'Sblocca la Sfida del Giorno',
		manage: 'Gestisci abbonamento',
		restore: 'Ripristina acquisti',
		privacy: 'Privacy',
		terms: 'Termini',
	},
} as const;
