import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

// ─── Mock saved spots ─────────────────────────────────────────────────────────

interface SavedSpot {
  id: string;
  name: string;
  neighborhood: string;
  emoji: string;
  rating: number;
  deals: string[];
  happyHourEnd: string;
  crowdLevel: 0 | 1 | 2 | 3 | 4;
  isActive: boolean;
  minLeft: number;
}

const MOCK_SAVED: SavedSpot[] = [
  { id: '1', name: 'Bottled Blonde', neighborhood: 'Uptown', emoji: '🍸', rating: 4.6, deals: ['$5 cocktails', '$4 draft beer'], happyHourEnd: '7:00 PM', crowdLevel: 3, isActive: true, minLeft: 47 },
  { id: '4', name: 'The Rustic', neighborhood: 'Design District', emoji: '🌿', rating: 4.5, deals: ['$5 margaritas', '$8 apps'], happyHourEnd: '7:00 PM', crowdLevel: 2, isActive: true, minLeft: 47 },
  { id: '6', name: 'Taco y Vino', neighborhood: 'Oak Cliff', emoji: '🌮', rating: 4.7, deals: ['$3 tacos', '$5 margaritas'], happyHourEnd: '7:00 PM', crowdLevel: 2, isActive: false, minLeft: 0 },
];

const CROWD = {
  0: { color: COLORS.muted },
  1: { color: '#34C759' },
  2: { color: '#FFB347' },
  3: { color: '#FF6B1A' },
  4: { color: '#FF3B30' },
} as const;

// ─── Saved card ───────────────────────────────────────────────────────────────

function SavedCard({ spot, onUnsave }: { spot: SavedSpot; onUnsave: () => void }) {
  const crowd = CROWD[spot.crowdLevel];
  const countdownColor = spot.minLeft <= 30 ? COLORS.status.error : spot.minLeft <= 60 ? COLORS.amber : COLORS.orange;

  return (
    <TouchableOpacity
      style={styles.cardWrapper}
      activeOpacity={0.82}
      onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: spot.id } } as any)}
    >
      <View style={styles.card}>
        {/* Left accent */}
        <View style={[styles.cardAccent, { backgroundColor: crowd.color }]} />

        <View style={[styles.cardEmojiBg, { backgroundColor: crowd.color + '18' }]}>
          <Text style={styles.cardEmoji}>{spot.emoji}</Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardRow}>
            <Text style={styles.cardName} numberOfLines={1}>{spot.name}</Text>
            {spot.isActive ? (
              <View style={styles.activePill}>
                <View style={styles.activeDot} />
                <Text style={styles.activePillText}>Live</Text>
              </View>
            ) : (
              <View style={styles.endedPill}>
                <Text style={styles.endedPillText}>Ended</Text>
              </View>
            )}
          </View>

          <View style={styles.cardMetaRow}>
            <Ionicons name="location-outline" size={11} color={COLORS.muted} />
            <Text style={styles.cardMeta}>{spot.neighborhood}</Text>
          </View>

          <Text style={styles.cardDeal} numberOfLines={1}>{spot.deals[0]}</Text>

          <View style={styles.cardFooter}>
            {spot.isActive ? (
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={11} color={countdownColor} />
                <Text style={[styles.timeText, { color: countdownColor }]}>
                  {spot.minLeft}m left · until {spot.happyHourEnd}
                </Text>
              </View>
            ) : (
              <Text style={styles.endedText}>Ends at {spot.happyHourEnd}</Text>
            )}
            <View style={styles.starRow}>
              <Ionicons name="star" size={11} color={COLORS.gold} />
              <Text style={styles.ratingText}>{spot.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.heartBtn} onPress={onUnsave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="heart" size={20} color="#FF375F" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SavedScreen() {
  const { user } = useAuthStore();
  const [spots, setSpots] = useState(MOCK_SAVED);

  const unsave = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSpots((prev) => prev.filter((s) => s.id !== id));
  };

  const activeCount = spots.filter((s) => s.isActive).length;

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Saved Spots</Text>
          <Text style={styles.headerSub}>Your favorite happy hours in one place</Text>
        </View>
        <View style={styles.gateContent}>
          <LinearGradient
            colors={['rgba(255,59,48,0.15)', 'rgba(255,59,48,0.05)', 'transparent']}
            style={styles.gateIconArea}
          >
            <Text style={styles.gateEmoji}>❤️</Text>
          </LinearGradient>
          <Text style={styles.gateTitle}>Save your favorites</Text>
          <Text style={styles.gateSub}>
            Sign in to bookmark spots, track happy hour times, and get notified before deals end.
          </Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/(auth)/login' as any)}>
            <Text style={styles.signInText}>Sign In to Save Spots</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Saved Spots</Text>
          <Text style={styles.headerSub}>
            {spots.length} saved · {activeCount} happening now
          </Text>
        </View>
        {activeCount > 0 && (
          <View style={styles.activeBadge}>
            <View style={styles.activeBadgeDot} />
            <Text style={styles.activeBadgeText}>{activeCount} live</Text>
          </View>
        )}
      </View>

      <FlatList
        data={spots}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SavedCard spot={item} onUnsave={() => unsave(item.id)} />}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconRing}>
              <Ionicons name="heart-outline" size={44} color={COLORS.muted} />
            </View>
            <Text style={styles.emptyTitle}>No saved spots</Text>
            <Text style={styles.emptySub}>Tap the heart on any listing to save it here</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/')}>
              <Text style={styles.exploreBtnText}>Browse Explore</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  headerTitle: { fontFamily: FONTS.playfair, fontSize: 24, color: COLORS.cream },
  headerSub: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted, marginTop: 3 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.overlay.orange15,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border.default,
  },
  activeBadgeDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: COLORS.orange },
  activeBadgeText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.orange },

  list: { paddingTop: SPACING.md, paddingBottom: 48 },

  cardWrapper: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    paddingLeft: SPACING.lg,
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, zIndex: 2 },
  cardEmojiBg: { width: 50, height: 50, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 26 },
  cardContent: { flex: 1, gap: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cardName: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.cream, flex: 1, letterSpacing: -0.2 },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(52,199,89,0.15)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(52,199,89,0.30)',
  },
  activeDot: { width: 5, height: 5, borderRadius: 99, backgroundColor: COLORS.status.success },
  activePillText: { fontFamily: FONTS.dmMedium, fontSize: 10, color: COLORS.status.success },
  endedPill: {
    backgroundColor: COLORS.overlay.inputBg,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  endedPillText: { fontFamily: FONTS.dmMedium, fontSize: 10, color: COLORS.muted },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardMeta: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },
  cardDeal: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.amber },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontFamily: FONTS.dmMedium, fontSize: 11 },
  endedText: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontFamily: FONTS.dmMedium, fontSize: 11, color: COLORS.gold },
  heartBtn: { padding: SPACING.xs },

  // Auth gate
  gateContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  gateIconArea: {
    width: 110, height: 110, borderRadius: 55,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  gateEmoji: { fontSize: 52 },
  gateTitle: { fontFamily: FONTS.playfair, fontSize: 26, color: COLORS.cream, textAlign: 'center', marginBottom: SPACING.sm },
  gateSub: { fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  signInBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  signInText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: '#FFFFFF' },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyIconRing: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.subtle,
    marginBottom: SPACING.xl,
  },
  emptyTitle: { fontFamily: FONTS.playfair, fontSize: 22, color: COLORS.cream, marginBottom: SPACING.sm },
  emptySub: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl },
  exploreBtn: {
    backgroundColor: COLORS.overlay.orange15,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border.default,
  },
  exploreBtnText: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.orange },
});
