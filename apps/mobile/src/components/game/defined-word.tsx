import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useWordMeaning } from '@/hooks/use-word-meaning';
import { WordMeaningSheet } from './word-meaning-sheet';

/** Wraps a displayed word without changing its layout or revealing hidden answers. */
export function DefinedWord({ word, children, style }: {
	readonly word: string;
	readonly children: ReactNode;
	readonly style?: StyleProp<ViewStyle>;
}) {
	const { selected, select, dismiss } = useWordMeaning();
	return (
		<>
			<Pressable accessibilityRole="button" accessibilityLabel={`Cosa significa ${word}`} onPress={() => select(word)} style={style}>
				{children}
			</Pressable>
			<WordMeaningSheet meaning={selected} onDismiss={dismiss} />
		</>
	);
}
