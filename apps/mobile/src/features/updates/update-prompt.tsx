import { ResultModal } from '@/components/game/result-modal';

import { useUpdatePrompt } from './use-update-prompt';

/** Offers a downloaded update inside the running app instead of waiting for a cold start. */
export function UpdatePrompt() {
	const { model, onPrimary, onDismiss } = useUpdatePrompt();
	if (!model.visible) return null;
	return (
		<ResultModal
			visible
			icon={model.icon}
			title={model.title}
			message={model.message}
			primaryLabel={model.primaryLabel}
			onPrimary={onPrimary}
			secondaryLabel={model.secondaryLabel}
			onSecondary={model.secondaryLabel === undefined ? undefined : onDismiss}
			onDismiss={onDismiss}
		/>
	);
}
