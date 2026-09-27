import { FlatList, StyleSheet, Text, View } from 'react-native';

import { DefinedWord } from '@/components/game/defined-word';
import { GameFonts } from '@/constants/game-theme';
import { useGameSurface } from '@/hooks/use-game-surface';

export function MissedWordsPanel({ words }: { readonly words: readonly string[] }) {
	const surface = useGameSurface();
	return (
		<View style={styles.panel}>
			<Text style={[styles.heading, { color: surface.text }]}>Parole non trovate · {words.length}</Text>
			<Text style={[styles.hint, { color: surface.textSecondary }]}>
				{words.length === 0 ? 'Hai trovato tutte le parole!' : 'Tocca una parola per scoprirne il significato.'}
			</Text>
			<FlatList
				style={styles.list}
				data={words}
				keyExtractor={(word) => word}
				renderItem={({ item }) => (
					<DefinedWord word={item} style={[styles.word, { backgroundColor: surface.tile }]}>
						<Text style={[styles.wordText, { color: surface.text }]}>{item}</Text>
					</DefinedWord>
				)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	panel: { alignSelf: 'stretch', marginTop: 12, flexShrink: 1 },
	heading: { fontFamily: GameFonts.body700, fontSize: 16 },
	hint: { fontFamily: GameFonts.body500, fontSize: 12, marginVertical: 6 },
	list: { maxHeight: 180, flexGrow: 0 },
	word: { paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4, borderRadius: 8 },
	wordText: { fontFamily: GameFonts.body700, fontSize: 15 },
});
