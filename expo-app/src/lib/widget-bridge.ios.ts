/**
 * iOS implementation of the Parola widget bridge (see widget-bridge.ts for
 * the shared types and the Android/web no-op).
 *
 * Importing the widget module runs createWidget, which registers the
 * widget's layout in the shared app group as soon as the bridge loads —
 * before any snapshot is written and before WidgetKit renders.
 */
import { parolaWidget } from '@/widgets/parola-widget';

import type { ParolaWidgetState } from './widget-bridge';

export type { ParolaWidgetState };

export function updateParolaWidget(state: ParolaWidgetState): void {
	parolaWidget.updateSnapshot(state);
}
