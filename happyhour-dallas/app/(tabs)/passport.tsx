import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

// ─── Static definitions ────────────────────────────────────────────────────────

interface NeighborhoodDef {
  id: string;   // matches restaurants.neighborhood value
  name: string;
  emoji: string;
  stampsTotal: number;
  color: string;
}

interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

const NEIGHBORHOOD_DEFS: NeighborhoodDef[] = [
  { id: 'uptown',       name: 'Uptown',          emoji: '🏙️', stampsTotal: 5, color: '#0A84FF' },
  { id: 'ellum',        name: 'Deep Ellum',       emoji: '🎵', stampsTotal: 5, color: '#BF5AF2' },
  { id: 'design',       name: 'Design District',  emoji: '🎨', stampsTotal: 5, color: '#FF6B1A' },
  { id: 'oakcliff',     name: 'Oak Cliff',        emoji: '🌮', stampsTotal: 5, color: '#34C759' },
  { id: 'lakeview',     name: 'Lake Highlands',   emoji: '🌊', stampsTotal: 5, color: '#30B0C7' },
  { id: 'bishop',       name: 'Bishop Arts',      emoji: '🖼️', stampsTotal: 5, color: '#FF375F' },
  { id: 'greenville',   name: 'Lower Greenville', emoji: '🌿', stampsTotal: 5, color: '#32D74B' },
  { id: 'lakewood',     name: 'Lakewood',         emoji: '🏡', stampsTotal: 5, color: '#FFD60A' },
];

const BADGE_DEFS: BadgeDef[] = [
  { id: 'first_timer',       name: 'First Timer',      emoji: '🍸', description: 'Completed your first check-in' },
  { id: 'uptown_regular',    name: 'Uptown Regular',   emoji: '🏙️', description: '3 check-ins in Uptown' },
  { id: 'ellum_explorer',    name: 'Ellum Explorer',   emoji: '🎵', description: '2 check-ins in Deep Ellum' },
  { id: 'deal_hunter',       name: 'Deal Hunter',      emoji: '💰', description: 'Saved $50+ with happy hour deals' },
  { id: 'social_butterfly',  name: 'Social Butterfly', emoji: '🦋', description: 'Check in with 3 different friends' },
  { id: 'neighborhood_pro',  name: 'Neighborhood Pro', emoji: '🗺️', description: 'Unlock all 8 neighborhoods' },
];

const LEVELS = [
  { name: 'Newcomer',       minPoints: 0,    color: COLORS.muted },
  { name: 'Regular',        minPoints: 100,  color: '#34C759' },
  { name: 'Local Legend',   minPoints: 500,  color: COLORS.amber },
  { name: 'Happy Hour Pro', minPoints: 1000, color: COLORS.orange },
  { name: 'Dallas Icon',    minPoints: 2500, color: '#FF375F' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEarnedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getLevelMeta(points: number) {
  const idx = LEVELS.findIndex(
    (l, i) => points >= l.minPoints && (i === LEVELS.length - 1 || points < LEVELS[i + 1].minPoints)
  );
  const current = LEVELS[Math.max(idx, 0)];
  const next = LEVELS[idx + 1] ?? null;
  const progress = next
    ? (points - current.minPoints) / (next.minPoints - current.minPoints)
    : 1;
  return { current, next, progress };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NeighborhoodStamp({
  def,
  stampsEarned,
  unlocked,
}: {
  def: NeighborhoodDef;
  stampsEarned: number;
  unlocked: boolean;
}) {
  return (
    <View style={[styles.stampCard, !unlocked && styles.stampCardLocked]}>
      <View style={[styles.stampIconBg, { backgroundColor: def.color + '20', borderColor: def.color + '40' }]}>
        <Text style={styles.stampEmoji}>{unlocked ? def.emoji : '🔒'}</Text>
      </View>
      <Text style={[styles.stampName, !unlocked && styles.stampNameLocked]} numberOfLines={1}>
        {def.name}
      </Text>
      {unlocked ? (
        <>
          <View style={styles.stampProgressBar}>
            <View
              style={[
                styles.stampProgressFill,
                { width: `${Math.min((stampsEarned / def.stampsTotal) * 100, 100)}%`, backgroundColor: def.color },
              ]}
            />
          </View>
          <Text style={[styles.stampCount, { color: def.color }]}>
            {Math.min(stampsEarned, def.stampsTotal)}/{def.stampsTotal}
          </Text>
        </>
      ) : (
        <Text style={styles.stampLockLabel}>0 visits</Text>
      )}
    </View>
  );
}

function BadgeCard({
  def,
  earned,
  earnedDate,
}: {
  def: BadgeDef;
  earned: boolean;
  earnedDate?: string;
}) {
  return (
    <View style={[styles.badgeCard, !earned && styles.badgeCardLocked]}>
      <View style={[styles.badgeEmojiWrap, earned && styles.badgeEmojiWrapEarned]}>
        <Text style={[styles.badgeEmoji, !earned && { opacity: 0.35 }]}>{def.emoji}</Text>
      </View>
      <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]}>{def.name}</Text>
      <Text style={styles.badgeDesc} numberOfLines={2}>{def.description}</Text>
      {earned && earnedDate && (
        <Text style={styles.badgeDate}>{earnedDate}</Text>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PassportScreen() {
  const { user, profile, refreshProfile } = useAuthStore();

  const [unlockedSet, setUnlockedSet] = useState<Set<string>>(new Set());
  const [checkinMap, setCheckinMap] = useState<Record<string, number>>({});
  const [earnedMap, setEarnedMap] = useState<Record<string, string>>({});  // badge_id → earned_at
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [stampsRes, checkinsRes, badgesRes] = await Promise.all([
      supabase.from('passport_stamps').select('neighborhood').eq('user_id', user.id),
      supabase
        .from('checkins')
        .select('restaurants(neighborhood)')
        .eq('user_id', user.id),
      supabase.from('user_badges').select('badge_type, earned_at').eq('user_id', user.id),
    ]);

    // Which neighborhoods are unlocked
    const unlocked = new Set<string>(
      (stampsRes.data ?? []).map((s: any) => s.neighborhood).filter(Boolean)
    );
    setUnlockedSet(unlocked);

    // Count checkins per neighborhood
    const counts: Record<string, number> = {};
    (checkinsRes.data ?? []).forEach((c: any) => {
      const hood = c.restaurants?.neighborhood;
      if (hood) counts[hood] = (counts[hood] ?? 0) + 1;
    });
    setCheckinMap(counts);

    // Which badges are earned (badge_id → earned_at ISO)
    const earned: Record<string, string> = {};
    (badgesRes.data ?? []).forEach((b: any) => {
      if (b.badge_type) earned[b.badge_type] = b.earned_at;
    });
    setEarnedMap(earned);

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    refreshProfile();
    loadData();
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile(), loadData()]);
    setRefreshing(false);
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const points = profile?.points ?? 0;
  const { current: currentLevel, next: nextLevel, progress } = getLevelMeta(points);

  const totalCheckins = Object.values(checkinMap).reduce((s, n) => s + n, 0);
  const unlockedCount = unlockedSet.size;
  const earnedBadgeCount = Object.keys(earnedMap).length;

  // ── Auth gate ─────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Happy Hour Passport</Text>
          <Text style={styles.headerSub}>Collect stamps across Dallas neighborhoods</Text>
        </View>
        <ScrollView contentContainerStyle={styles.gateContent}>
          <LinearGradient
            colors={['rgba(232,168,48,0.20)', 'rgba(232,168,48,0.05)', 'transparent']}
            style={styles.gateIconArea}
          >
            <Text style={styles.gateEmoji}>📖</Text>
          </LinearGradient>
          <Text style={styles.gateTitle}>Your Passport Awaits</Text>
          <Text style={styles.gateSub}>
            Check in at spots across Uptown, Deep Ellum, Oak Cliff, and 5 more neighborhoods
            to earn stamps, badges, and climb the leaderboard.
          </Text>
          <View style={styles.previewGrid}>
            {NEIGHBORHOOD_DEFS.slice(0, 4).map((n) => (
              <View key={n.id} style={[styles.previewChip, { borderColor: n.color + '40', backgroundColor: n.color + '12' }]}>
                <Text style={styles.previewEmoji}>{n.emoji}</Text>
                <Text style={[styles.previewLabel, { color: n.color }]}>{n.name}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/(auth)/login' as any)}>
            <Text style={styles.signInText}>Sign In to Start Collecting</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Signed in ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Happy Hour Passport</Text>
        <Text style={styles.headerSub}>
          {loading ? 'Loading…' : `${unlockedCount} neighborhoods · ${totalCheckins} check-ins`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.orange} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.orange}
              colors={[COLORS.orange]}
            />
          }
        >

          {/* ── Level card ── */}
          <LinearGradient
            colors={['rgba(255,107,26,0.22)', 'rgba(255,107,26,0.08)', 'rgba(26,10,0,0)']}
            style={styles.levelCard}
          >
            <View style={styles.levelCardInner}>
              <View style={styles.levelLeft}>
                <Text style={styles.levelLabel}>Your Level</Text>
                <Text style={[styles.levelName, { color: currentLevel.color }]}>{currentLevel.name}</Text>
                <Text style={styles.levelPoints}>{points} pts</Text>
              </View>
              <View style={styles.levelRight}>
                <Text style={styles.levelNextLabel}>
                  {nextLevel
                    ? `${nextLevel.minPoints - points} pts to ${nextLevel.name}`
                    : 'Max level reached!'}
                </Text>
                <View style={styles.levelProgressTrack}>
                  <View
                    style={[
                      styles.levelProgressFill,
                      { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: currentLevel.color },
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.statsRow}>
              {[
                { value: unlockedSet.size.toString(), label: 'Stamps' },
                { value: earnedBadgeCount.toString(),  label: 'Badges' },
                { value: unlockedCount.toString(),     label: 'Neighborhoods' },
                { value: totalCheckins.toString(),     label: 'Check-ins' },
              ].map((stat) => (
                <View key={stat.label} style={styles.statBox}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          {/* ── Neighborhood stamps ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Neighborhoods</Text>
            <Text style={styles.sectionSub}>{unlockedCount} of {NEIGHBORHOOD_DEFS.length} unlocked</Text>
          </View>

          <View style={styles.stampGrid}>
            {NEIGHBORHOOD_DEFS.map((def) => (
              <NeighborhoodStamp
                key={def.id}
                def={def}
                stampsEarned={checkinMap[def.id] ?? 0}
                unlocked={unlockedSet.has(def.id)}
              />
            ))}
          </View>

          {/* ── Badges ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <Text style={styles.sectionSub}>{earnedBadgeCount} earned</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesRow}
          >
            {BADGE_DEFS.map((def) => (
              <BadgeCard
                key={def.id}
                def={def}
                earned={!!earnedMap[def.id]}
                earnedDate={earnedMap[def.id] ? formatEarnedDate(earnedMap[def.id]) : undefined}
              />
            ))}
          </ScrollView>

          {/* ── Leaderboard link ── */}
          <TouchableOpacity
            style={styles.leaderboardRow}
            onPress={() => router.push('/leaderboard' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.leaderboardIconBg}>
              <Ionicons name="trophy-outline" size={18} color={COLORS.gold} />
            </View>
            <View style={styles.leaderboardLabel}>
              <Text style={styles.leaderboardTitle}>Dallas Leaderboard</Text>
              <Text style={styles.leaderboardSub}>See how you rank against the city</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </TouchableOpacity>

          {/* ── How to earn stamps ── */}
          <View style={styles.howToCard}>
            <Text style={styles.howToTitle}>How to earn stamps</Text>
            {[
              { icon: 'location' as const,  text: 'Check in during happy hour at any verified spot' },
              { icon: 'star' as const,      text: 'Leave a review for bonus points' },
              { icon: 'people' as const,    text: 'Bring friends — social check-ins earn 2× stamps' },
            ].map((item) => (
              <View key={item.text} style={styles.howToRow}>
                <View style={styles.howToIconBg}>
                  <Ionicons name={item.icon} size={15} color={COLORS.orange} />
                </View>
                <Text style={styles.howToText}>{item.text}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  headerTitle: { fontFamily: FONTS.playfair, fontSize: 24, color: COLORS.cream },
  headerSub: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted, marginTop: 3 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 48 },

  // Level card
  levelCard: {
    margin: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    overflow: 'hidden',
  },
  levelCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.xl,
  },
  levelLeft: {},
  levelLabel: {
    fontFamily: FONTS.dmMedium, fontSize: 11,
    color: COLORS.muted, letterSpacing: 0.6,
    textTransform: 'uppercase', marginBottom: 4,
  },
  levelName: { fontFamily: FONTS.playfair, fontSize: 22, marginBottom: 2 },
  levelPoints: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted },
  levelRight: { flex: 1, paddingTop: 20 },
  levelNextLabel: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, marginBottom: 8 },
  levelProgressTrack: { height: 6, backgroundColor: COLORS.overlay.inputBg, borderRadius: 3, overflow: 'hidden' },
  levelProgressFill: { height: '100%', borderRadius: 3 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border.subtle },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: SPACING.md },
  statValue: { fontFamily: FONTS.playfair, fontSize: 20, color: COLORS.orange },
  statLabel: { fontFamily: FONTS.dmRegular, fontSize: 10, color: COLORS.muted, marginTop: 2 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
  },
  sectionTitle: { fontFamily: FONTS.playfair, fontSize: 20, color: COLORS.cream },
  sectionSub: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted },

  // Stamp grid
  stampGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: SPACING.md, gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  stampCard: {
    width: '47%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    alignItems: 'center',
  },
  stampCardLocked: { opacity: 0.5 },
  stampIconBg: {
    width: 52, height: 52, borderRadius: RADIUS.lg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: SPACING.sm,
  },
  stampEmoji: { fontSize: 26 },
  stampName: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.cream, marginBottom: 6, textAlign: 'center' },
  stampNameLocked: { color: COLORS.muted },
  stampProgressBar: {
    width: '100%', height: 4,
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: 2, overflow: 'hidden', marginBottom: 4,
  },
  stampProgressFill: { height: '100%', borderRadius: 2 },
  stampCount: { fontFamily: FONTS.dmMedium, fontSize: 11 },
  stampLockLabel: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },

  // Badges
  badgesRow: {
    paddingHorizontal: SPACING.lg, gap: SPACING.sm,
    paddingBottom: SPACING.sm, marginBottom: SPACING.lg,
  },
  badgeCard: {
    width: 130,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    alignItems: 'center',
  },
  badgeCardLocked: { opacity: 0.45 },
  badgeEmojiWrap: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  badgeEmojiWrapEarned: {
    backgroundColor: 'rgba(232,168,48,0.18)',
    borderColor: 'rgba(232,168,48,0.35)',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  badgeEmoji: { fontSize: 26 },
  badgeName: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.cream, textAlign: 'center', marginBottom: 4 },
  badgeNameLocked: { color: COLORS.muted },
  badgeDesc: { fontFamily: FONTS.dmRegular, fontSize: 10, color: COLORS.muted, textAlign: 'center', lineHeight: 14 },
  badgeDate: { fontFamily: FONTS.dmMedium, fontSize: 10, color: COLORS.gold, marginTop: 4 },

  // Leaderboard row
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(232,168,48,0.25)',
  },
  leaderboardIconBg: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(232,168,48,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(232,168,48,0.25)',
  },
  leaderboardLabel: { flex: 1 },
  leaderboardTitle: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.cream },
  leaderboardSub: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, marginTop: 2 },

  // How-to card
  howToCard: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    marginBottom: SPACING.xl,
  },
  howToTitle: { fontFamily: FONTS.playfair, fontSize: 18, color: COLORS.cream, marginBottom: SPACING.md },
  howToRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  howToIconBg: {
    width: 32, height: 32, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.overlay.orange15,
    alignItems: 'center', justifyContent: 'center',
  },
  howToText: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted, flex: 1, lineHeight: 18 },

  // Auth gate
  gateContent: { alignItems: 'center', padding: SPACING.xl, paddingBottom: 60 },
  gateIconArea: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.xl, marginTop: SPACING.xl,
  },
  gateEmoji: { fontSize: 56 },
  gateTitle: { fontFamily: FONTS.playfair, fontSize: 26, color: COLORS.cream, marginBottom: SPACING.sm, textAlign: 'center' },
  gateSub: { fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl, justifyContent: 'center' },
  previewChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  previewEmoji: { fontSize: 16 },
  previewLabel: { fontFamily: FONTS.dmMedium, fontSize: 13 },
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
});
