import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameFonts, GamePalette, GameRadius, GameShadow } from '@/constants/game-theme';
import { usePlayerStats } from '@/features/stats/use-player-stats';
import { useGameSurface } from '@/hooks/use-game-surface';
import { useScreenInteractive } from '@/hooks/use-screen-interactive';

export default function ClassificaScreen() {
  const surface = useGameSurface();
  const insets = useSafeAreaInsets();
  const stats = usePlayerStats();
  useScreenInteractive(stats.hydrated);

  const rows = [
    {
      icon: '🟩',
      title: 'Paròle',
      metric: 'Serie di vittorie',
      value: stats.parolaStreak,
      unit: stats.parolaStreak === 1 ? 'giorno' : 'giorni',
    },
    {
      icon: '🔀',
      title: 'Anagrammi+',
      metric: 'Punteggio totale',
      value: stats.anagrammiScore,
      unit: 'punti',
    },
    {
      icon: '🔥',
      title: 'Anagrammi+',
      metric: 'Serie più lunga',
      value: stats.anagrammiStreak,
      unit: 'di fila',
    },
  ];

  return (
    <View style={[styles.safe, { backgroundColor: surface.background }]}>
      <StatusBar style="auto" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.overline}>I TUOI RECORD</Text>
        <Text style={[styles.title, { color: surface.text }]}>Classifica</Text>
        {rows.map((row) => (
          <View key={row.metric} style={[styles.card, { backgroundColor: surface.card }]}>
            <View style={[styles.emojiTile, { backgroundColor: surface.tile }]}>
              <Text style={styles.emojiTileText}>{row.icon}</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: surface.text }]}>{row.title}</Text>
              <Text style={[styles.cardMetric, { color: surface.textSecondary }]}>{row.metric}</Text>
            </View>
            <View style={styles.valueBlock}>
              <Text style={styles.value}>{stats.hydrated ? row.value : '–'}</Text>
              <Text style={[styles.unit, { color: surface.textTertiary }]}>{row.unit}</Text>
            </View>
          </View>
        ))}
        <Text style={[styles.footnote, { color: surface.textTertiary }]}>
          Caccia, Paroliere+ e Il Palloncino si giocano a partite singole: i punteggi valgono per
          la sessione.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  overline: {
    fontFamily: GameFonts.body600,
    fontSize: 13,
    letterSpacing: 3,
    color: GamePalette.primary,
  },
  title: { fontFamily: GameFonts.display800, fontSize: 32, marginTop: -8, marginBottom: 6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: GameRadius.lg,
    paddingVertical: 17,
    paddingHorizontal: 20,
    ...GameShadow.card,
  },
  emojiTile: {
    width: 54,
    height: 54,
    borderRadius: GameRadius.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiTileText: { fontSize: 27 },
  cardText: { flex: 1, gap: 2, minWidth: 0 },
  cardTitle: { fontFamily: GameFonts.display700, fontSize: 21 },
  cardMetric: { fontFamily: GameFonts.body500, fontSize: 14 },
  valueBlock: { alignItems: 'center', gap: 1 },
  value: { fontFamily: GameFonts.display800, fontSize: 26, color: GamePalette.primary },
  unit: { fontFamily: GameFonts.body600, fontSize: 12 },
  footnote: {
    fontFamily: GameFonts.body500,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
});
