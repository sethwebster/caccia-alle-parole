import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameFonts, GamePalette, GameRadius, GameShadow } from '@/constants/game-theme';
import { ArchiveAccessCard } from '@/components/daily/archive-access-card';
import { useAvatar } from '@/features/profile/use-avatar';
import { MAX_USERNAME_LENGTH, useUsername } from '@/features/profile/use-username';
import { usePlayerStats } from '@/features/stats/use-player-stats';
import { useGameSurface } from '@/hooks/use-game-surface';
import { useScreenInteractive } from '@/hooks/use-screen-interactive';

export default function ProfiloScreen() {
  const surface = useGameSurface();
  const insets = useSafeAreaInsets();
  const stats = usePlayerStats();
  const { hydrated, username, saveUsername } = useUsername();
  useScreenInteractive(hydrated);
  const { avatarUri, pickAvatar } = useAvatar();

  return (
    <View style={[styles.safe, { backgroundColor: surface.background }]}>
      <StatusBar style="auto" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cambia immagine del profilo"
            onPress={() => void pickAvatar()}
            style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}
          >
            <View style={styles.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <SymbolView
                  name={{ ios: 'person.fill', android: 'person', web: 'person' }}
                  size={44}
                  tintColor={GamePalette.primary}
                />
              )}
            </View>
            <View style={styles.avatarBadge}>
              <SymbolView
                name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
                size={16}
                tintColor={GamePalette.onPrimary}
              />
            </View>
          </Pressable>
          {hydrated ? (
            <UsernameEditor username={username} onSave={saveUsername} />
          ) : (
            <Text style={[styles.name, { color: surface.text }]}> </Text>
          )}
          <Text style={[styles.tagline, { color: surface.textSecondary }]}>
            Appassionato di paròle
          </Text>
        </View>
        <View style={styles.statRow}>
          <StatTile
            label="Serie Sfida Giornaliera"
            value={stats.hydrated ? `${stats.dailyChallengeStreak} 🔥` : '–'}
          />
          <StatTile
            label="Punti Anagrammi"
            value={stats.hydrated ? String(stats.anagrammiScore) : '–'}
          />
        </View>
        <View style={styles.statRow}>
          <StatTile
            label="Sfide completate"
            value={stats.hydrated ? String(stats.dailyChallengeCompletions) : '–'}
          />
          <StatTile
            label="Sfide perfette"
            value={stats.hydrated ? String(stats.dailyChallengePerfect) : '–'}
          />
        </View>
        <ArchiveAccessCard compact />
      </ScrollView>
    </View>
  );
}

function UsernameEditor({
  username,
  onSave,
}: {
  username: string;
  onSave: (name: string) => void;
}) {
  const surface = useGameSurface();
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null) {
    return (
      <>
        <Text style={[styles.name, { color: surface.text }]}>{username || 'Giocatore'}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Modifica nome"
          onPress={() => setDraft(username)}
          style={({ pressed }) => [
            styles.editButton,
            { backgroundColor: surface.tile },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
            size={13}
            tintColor={GamePalette.primary}
          />
          <Text style={styles.editButtonText}>Modifica nome</Text>
        </Pressable>
      </>
    );
  }

  const commit = () => {
    onSave(draft);
    setDraft(null);
  };

  return (
    <>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={commit}
        autoFocus
        maxLength={MAX_USERNAME_LENGTH}
        placeholder="Il tuo nome"
        placeholderTextColor={surface.textTertiary}
        returnKeyType="done"
        style={[
          styles.nameInput,
          { color: surface.text, backgroundColor: surface.card, borderColor: surface.border },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        onPress={commit}
        style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
      >
        <Text style={styles.saveButtonText}>Salva</Text>
      </Pressable>
    </>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  const surface = useGameSurface();
  return (
    <View style={[styles.statTile, { backgroundColor: surface.card }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statLabel, { color: surface.textSecondary }]}>{label}</Text>
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
  pressed: { transform: [{ scale: 0.97 }] },
  header: { alignItems: 'center', gap: 4, paddingVertical: 12 },
  avatarWrap: { marginBottom: 8 },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: GamePalette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GamePalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...GameShadow.subtle,
  },
  name: { fontFamily: GameFonts.display800, fontSize: 28 },
  nameInput: {
    fontFamily: GameFonts.display700,
    fontSize: 22,
    textAlign: 'center',
    minWidth: 220,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: GameRadius.md,
    borderWidth: 2,
  },
  editButton: {
    height: 34,
    paddingHorizontal: 14,
    marginTop: 4,
    borderRadius: GameRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  editButtonText: { fontFamily: GameFonts.body700, fontSize: 13, color: GamePalette.primary },
  saveButton: {
    height: 44,
    paddingHorizontal: 26,
    marginTop: 6,
    borderRadius: GameRadius.md,
    backgroundColor: GamePalette.primary,
    justifyContent: 'center',
  },
  saveButtonText: { fontFamily: GameFonts.display700, fontSize: 16, color: GamePalette.onPrimary },
  tagline: { fontFamily: GameFonts.body500, fontSize: 14.5 },
  statRow: { flexDirection: 'row', gap: 14 },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    borderRadius: GameRadius.lg,
    paddingVertical: 20,
    ...GameShadow.card,
  },
  statValue: { fontFamily: GameFonts.display800, fontSize: 26, color: GamePalette.primary },
  statLabel: { fontFamily: GameFonts.body600, fontSize: 13 },
});
