import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { Easing, FadeIn, Keyframe } from 'react-native-reanimated';

import { GameFonts, GamePalette, GameRadius, GameShadow } from '@/constants/game-theme';
import { useGameSurface } from '@/hooks/use-game-surface';
import type { SelectedWordMeaning } from '@/hooks/use-word-meaning';

const cardIn = new Keyframe({
	0: { opacity: 0, transform: [{ translateY: 24 }] },
	100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.bezier(0.22, 1, 0.36, 1).factory() },
}).duration(220);

const POS_LABELS: Record<string, string> = {
	noun: 'sostantivo',
	verb: 'verbo',
	adj: 'aggettivo',
	adv: 'avverbio',
	pron: 'pronome',
	prep: 'preposizione',
	conj: 'congiunzione',
	intj: 'interiezione',
	num: 'numerale',
	article: 'articolo',
};

/** What a found word means. Shown on tap, so the player learns the word they just traced. */
export function WordMeaningSheet({ meaning, onDismiss }: { readonly meaning: SelectedWordMeaning | null; readonly onDismiss: () => void }) {
	const surface = useGameSurface();
	if (meaning === null) return null;
	const definition = meaning.meaning;
	// An inflected form is worth naming: PARLIAMO teaches more as a form of "parlare".
	const isInflection = definition !== null && meaning.found.toUpperCase() !== definition.lemma.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

	return (
		<Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
			<Pressable style={styles.backdrop} onPress={onDismiss}>
				<Animated.View entering={cardIn} style={[styles.card, { backgroundColor: surface.card, borderColor: surface.border }]}>
					<Pressable onPress={(event) => event.stopPropagation()}>
						<Text style={[styles.found, { color: surface.text }]}>{meaning.found}</Text>
						{definition === null ? (
							<Text style={[styles.gloss, { color: surface.textTertiary }]}>Definizione non disponibile.</Text>
						) : (
							<>
								{isInflection ? <Text style={[styles.lemma, { color: surface.textTertiary }]}>da <Text style={styles.lemmaWord}>{definition.lemma}</Text></Text> : null}
								{definition.pos.length > 0 ? <Text style={styles.pos}>{POS_LABELS[definition.pos] ?? definition.pos}</Text> : null}
								<Animated.View entering={FadeIn.delay(60)}>
									<Text style={[styles.sectionLabel, { color: surface.textTertiary }]}>Inglese</Text>
									<Text style={[styles.gloss, { color: surface.text }]}>{definition.english}</Text>
									{definition.italian.length > 0 ? <><Text style={[styles.sectionLabel, { color: surface.textTertiary }]}>Italiano</Text><Text style={[styles.gloss, { color: surface.text }]}>{definition.italian}</Text></> : null}
								</Animated.View>
							</>
						)}
					</Pressable>
				</Animated.View>
			</Pressable>
		</Modal>
	);
}

const styles = StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
	card: {
		borderTopLeftRadius: GameRadius.lg,
		borderTopRightRadius: GameRadius.lg,
		borderWidth: 1,
		paddingHorizontal: 22,
		paddingTop: 20,
		paddingBottom: 38,
		...GameShadow.card,
	},
	found: { fontFamily: GameFonts.display700, fontSize: 30, letterSpacing: 1 },
	lemma: { fontFamily: GameFonts.body600, fontSize: 14, marginTop: 2 },
	lemmaWord: { fontFamily: GameFonts.body700, color: GamePalette.primary },
	pos: { fontFamily: GameFonts.body600, fontSize: 12, color: GamePalette.primary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 },
	sectionLabel: { fontFamily: GameFonts.body600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 18 },
	gloss: { fontFamily: GameFonts.body500, fontSize: 16, lineHeight: 22, marginTop: 4 },
});
