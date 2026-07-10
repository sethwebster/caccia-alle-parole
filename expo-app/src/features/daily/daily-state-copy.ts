import type { DailyCatalogResolution } from './catalog';
import { type DailyStateCopy, DAILY_COPY } from './daily-copy';
import type { ProgressError } from './progress-model';

type UpdateRequiredReason = Extract<DailyCatalogResolution, { readonly kind: 'updateRequired' }>['reason'];

export function loadingDailyState(): DailyStateCopy {
	return DAILY_COPY.state.loading;
}

export function invalidDailyRouteState(): DailyStateCopy {
	return { eyebrow: 'CATALOGO SFIDA', title: 'Data non valida', message: 'Il collegamento della Sfida Giornaliera non contiene una data locale valida.', detail: 'Apri una sfida dall’archivio o torna alla sfida di oggi.', tone: 'error' };
}

export function dailyProgressErrorState(error: ProgressError): DailyStateCopy {
	switch (error.kind) {
		case 'readFailed':
			return { eyebrow: 'PROGRESSI LOCALI', title: 'Progressi non leggibili', message: 'Non riusciamo ad aprire la cronologia della Sfida Giornaliera su questo dispositivo.', detail: 'Chiudi e riapri l’app: i risultati ufficiali non vengono sostituiti.', tone: 'error' };
		case 'writeFailed':
			return { eyebrow: 'SALVATAGGIO LOCALE', title: 'Risultato non salvato', message: 'La sfida è al sicuro, ma questo passaggio non è stato registrato.', detail: 'Riprova prima di uscire per non perdere il progresso ufficiale.', tone: 'error' };
		case 'verificationFailed':
			return { eyebrow: 'SALVATAGGIO LOCALE', title: 'Verifica non riuscita', message: 'Il dispositivo non ha confermato il salvataggio della Sfida Giornaliera.', detail: 'Nessun risultato ufficiale viene riscritto finché la verifica non riesce.', tone: 'warning' };
		case 'corruptRecord':
			return { eyebrow: 'RECUPERO PROGRESSI', title: 'Progressi da recuperare', message: 'La cronologia locale non è coerente e richiede attenzione prima di continuare.', detail: 'Abbiamo bloccato nuove scritture per proteggere il primo risultato ufficiale.', tone: 'warning' };
	}
}

export function dailyCatalogUpdateState(reason: UpdateRequiredReason): DailyStateCopy {
	switch (reason) {
		case 'outsideSupportedRange':
			return { eyebrow: 'CATALOGO SFIDA', title: 'Aggiornamento richiesto', message: 'La data richiesta è fuori dal periodo supportato dal catalogo installato.', detail: 'Aggiorna l’app per ricevere le nuove Sfide Giornaliere.', tone: 'warning' };
		case 'unsupportedEpoch':
			return { eyebrow: 'CATALOGO SFIDA', title: 'Catalogo non compatibile', message: 'Questa sfida appartiene a una versione di catalogo diversa da quella installata.', detail: 'Aggiorna l’app o apri una sfida già salvata in archivio.', tone: 'warning' };
		case 'corruptCatalog':
			return { eyebrow: 'CATALOGO SFIDA', title: 'Catalogo da aggiornare', message: 'Il catalogo incluso non supera i controlli della Sfida Giornaliera.', detail: 'Aggiorna l’app: non generiamo contenuti alternativi per proteggere la sfida ufficiale.', tone: 'error' };
	}
}
