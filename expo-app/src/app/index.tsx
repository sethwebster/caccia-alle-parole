import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGameSurface } from '@/hooks/use-game-surface';

const GAMES = [
  {
    href: '/parola' as const,
    icon: '🟩',
    title: 'Paròle',
    subtitle: 'La parola del giorno in 6 tentativi',
    accent: '#22c55e',
    badge: 'Nuovo Puzzle',
  },
  {
    href: '/caccia' as const,
    icon: '🔍',
    title: 'Caccia alle Paròle',
    subtitle: 'Trova le parole nascoste nella griglia',
    accent: '#4f46e5',
  },
  {
    href: '/paroliere' as const,
    icon: '🎭',
    title: 'Paroliere+',
    subtitle: 'Collega le lettere, batti il tempo',
    accent: '#f59e0b',
  },
  {
    href: '/impiccato' as const,
    icon: '🎪',
    title: "L'Impiccato",
    subtitle: 'Indovina la parola lettera per lettera',
    accent: '#ef4444',
  },
  {
    href: '/anagrammi' as const,
    icon: '🔀',
    title: 'Anagrammi+',
    subtitle: 'Riordina le lettere contro il tempo',
    accent: '#8b5cf6',
  },
];

export default function HomeScreen() {
  const surface = useGameSurface();
  const router = useRouter();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: surface.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Image
            source={require('../../assets/images/caccia-parole-logo.png')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="Caccia Paròle Logo"
          />
          <Text style={[styles.brand, { color: surface.text }]}>Caccia Paròle</Text>
          <Text style={[styles.tagline, { color: surface.textSecondary }]}>
            La sfida quotidiana con la lingua italiana
          </Text>
        </View>
        <View style={styles.cards}>
          {GAMES.map((game, i) => (
            <Animated.View key={game.href} entering={FadeInDown.delay(i * 80).springify().damping(18)}>
              {/* Not Link asChild: on web it drops the Pressable's function-form style. */}
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(game.href)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: surface.card, borderColor: surface.border },
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${game.accent}1a` }]}>
                  <Text style={styles.icon}>{game.icon}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, { color: surface.text }]}>{game.title}</Text>
                  <Text style={[styles.cardSubtitle, { color: surface.textSecondary }]}>{game.subtitle}</Text>
                </View>
                {game.badge ? (
                  <View style={[styles.badge, { backgroundColor: game.accent }]}>
                    <Text style={styles.badgeText}>{game.badge}</Text>
                  </View>
                ) : null}
                <Text style={[styles.chevron, { color: game.accent }]}>›</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
        <Text style={[styles.footer, { color: surface.textTertiary }]}>
          © 2026 Caccia Paròle • Made with 🇮🇹
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' },
  hero: { paddingVertical: 28, alignItems: 'center' },
  logo: { width: 132, height: 88, marginBottom: 10 },
  brand: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { fontSize: 15, marginTop: 6, textAlign: 'center' },
  cards: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 26 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  cardSubtitle: { fontSize: 13, marginTop: 2 },
  chevron: { fontSize: 28, fontWeight: '700' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  footer: { textAlign: 'center', marginTop: 28, fontSize: 12, fontWeight: '600' },
});
