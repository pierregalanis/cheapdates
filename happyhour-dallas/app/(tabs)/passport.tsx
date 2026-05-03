import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Neighborhood {
  id: string;
  name: string;
  emoji: string;
  stampsEarned: number;
  stampsTotal: number;
  color: string;
  unlocked: boolean;
}

interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earned: boolean;
  earnedDate?: string;
}

const NEIGHBORHOODS: Neighborhood[] = [
  { id: 'uptown',    name: 'Uptown',           emoji: '🏙️', stampsEarned: 3, stampsTotal: 5, color: '#0A84FF', unlocked: true },
  { id: 'ellum',     name: 'Deep Ellum',        emoji: '🎵', stampsEarned: 2, stampsTotal: 5, color: '#BF5AF2', unlocked: true },
  { id: 'design',    name: 'Design District',   emoji: '🎨', stampsEarned: 1, stampsTotal: 5, color: '#FF6B1A', unlocked: true },
  { id: 'oakcliff',  name: 'Oak Cliff',         emoji: '🌮', stampsEarned: 1, stampsTotal: 5, color: '#34C759', unlocked: true },
  { id: 'lakeview',  name: 'Lake Highlands',    emoji: '🌊', stampsEarned: 0, stampsTotal: 5, color: '#30B0C7', unlocked: false },
  { id: 'bishop',    name: 'Bishop Arts',       emoji: '🖼️', stampsEarned: 0, stampsTotal: 5, color: '#FF375F', unlocked: false },
  { id: 'greenville',name: 'Lower Greenville',  emoji: '🌿', stampsEarned: 0, stampsTotal: 5, color: '#32D74B', unlocked: false },
  { id: 'lakewood',  name: 'Lakewood',          emoji: '🏡', stampsEarned: 0, stampsTotal: 5, color: '#FFD60A', unlocked: false },
];

const BADGES: Badge[] = [
  { id: '1', name: 'First Timer',      emoji: '🍸', description: 'Completed your first check-in',        earned: true,  earnedDate: 'Apr 28' },
  { id: '2', name: 'Uptown Regular',   emoji: '🏙️', description: '3 check-ins in Uptown',                earned: true,  earnedDate: 'May 1' },
  { id: '3', name: 'Ellum Explorer',   emoji: '🎵', description: '2 check-ins in Deep Ellum',            earned: true,  earnedDate: 'May 2' },
  { id: '4', name: 'Deal Hunter',      emoji: '💰', description: 'Saved $50+ with happy hour deals',     earned: false },
  { id: '5', name: 'Social Butterfly', emoji: '🦋', description: 'Check in with 3 different friends',    earned: false },
  { id: '6', name: 'Neighborhood Pro', emoji: '🗺️', description: 'Unlock all 8 neighborhoods',           earned: false },
];

const LEVELS = [
  { name: 'Newcomer',      minPoints: 0,    color: COLORS.muted },
  { name: 'Regular',       minPoints: 100,  color: '#34C759' },
  { name: 'Local Legend',  minPoints: 500,  color: COLORS.amber },
  { name: 'Happy Hour Pro',minPoints: 1000, color: COLORS.orange },
  { name: 'Dallas Icon',   minPoints: 2500, color: '#FF375F' },
];

const USER_POINTS = 145;
const USER_LEVEL_IDX = LEVELS.findIndex((l, i) => USER_POINTS >= l.minPoints && (i === LEVELS.length - 1 || USER_POINTS < LEVELS[i + 1].minPoints));
const CURRENT_LEVEL = LEVELS[USER_LEVEL_IDX];
const NEXT_LEVEL = LEVELS[USER_LEVEL_IDX + 1];
const PROGRESS = NEXT_LEVEL
  ? (USER_POINTS - CURRENT_LEVEL.minPoints) / (NEXT_LEVEL.minPoints - CURRENT_LEVEL.minPoints)
  : 1;

// ─── Components ───────────────────────────────────────────────────────────────

function NeighborhoodStamp({ n }: { n: Neighborhood }) {
  return (
    <View style={[styles.stampCard, !n.unlocked && styles.stampCardLocked]}>
      <View style={[styles.stampIconBg, { backgroundColor: n.color + '20', borderColor: n.color + '40' }]}>
        <Text style={styles.stampEmoji}>{n.unlocked ? n.emoji : '🔒'}</Text>
      </View>
      <Text style={[styles.stampName, !n.unlocked && styles.stampNameLocked]} numberOfLines={1}>
        {n.name}
      </Text>
      {n.unlocked ? (
        <>
          <View style={styles.stampProgressBar}>
            <View style={[styles.stampProgressFill, { width: `${(n.stampsEarned / n.stampsTotal) * 100}%`, backgroundColor: n.color }]} />
          </View>
          <Text style={[styles.stampCount, { color: n.color }]}>
            {n.stampsEarned}/{n.stampsTotal}
          </Text>
        </>
      ) : (
        <Text style={styles.stampLockLabel}>0 visits</Text>
      )}
    </View>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <View style={[styles.badgeCard, !badge.earned && styles.badgeCardLocked]}>
      <View style={[styles.badgeEmojiWrap, badge.earned && styles.badgeEmojiWrapEarned]}>
        <Text style={[styles.badgeEmoji, !badge.earned && { opacity: 0.35 }]}>{badge.emoji}</Text>
      </View>
      <Text style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]}>{badge.name}</Text>
      <Text style={styles.badgeDesc} numberOfLines={2}>{badge.description}</Text>
      {badge.earned && badge.earnedDate && (
        <Text style={styles.badgeDate}>{badge.earnedDate}</Text>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PassportScreen() {
  const { user } = useAuthStore();
  const totalStamps = NEIGHBORHOODS.reduce((s, n) => s + n.stampsEarned, 0);
  const unlockedCount = NEIGHBORHOODS.filter((n) => n.unlocked).length;

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
            Check in at spots across Uptown, Deep Ellum, Oak Cliff, and 5 more neighborhoods to earn stamps, badges, and climb the leaderboard.
          </Text>

          {/* Preview neighborhoods locked */}
          <View style={styles.previewGrid}>
            {NEIGHBORHOODS.slice(0, 4).map((n) => (
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Happy Hour Passport</Text>
        <Text style={styles.headerSub}>{totalStamps} stamps · {unlockedCount} neighborhoods</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Level card ── */}
        <LinearGradient
          colors={['rgba(255,107,26,0.22)', 'rgba(255,107,26,0.08)', 'rgba(26,10,0,0)']}
          style={styles.levelCard}
        >
          <View style={styles.levelCardInner}>
            <View style={styles.levelLeft}>
              <Text style={styles.levelLabel}>Your Level</Text>
              <Text style={[styles.levelName, { color: CURRENT_LEVEL.color }]}>{CURRENT_LEVEL.name}</Text>
              <Text style={styles.levelPoints}>{USER_POINTS} pts</Text>
            </View>
            <View style={styles.levelRight}>
              <Text style={styles.levelNextLabel}>
                {NEXT_LEVEL ? `${NEXT_LEVEL.minPoints - USER_POINTS} pts to ${NEXT_LEVEL.name}` : 'Max level reached!'}
              </Text>
              <View style={styles.levelProgressTrack}>
                <View style={[styles.levelProgressFill, { width: `${Math.min(PROGRESS * 100, 100)}%`, backgroundColor: CURRENT_LEVEL.color }]} />
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            {[
              { value: totalStamps.toString(), label: 'Stamps' },
              { value: BADGES.filter((b) => b.earned).length.toString(), label: 'Badges' },
              { value: unlockedCount.toString(), label: 'Neighborhoods' },
              { value: '7', label: 'Check-ins' },
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
          <Text style={styles.sectionSub}>{unlockedCount} of 8 unlocked</Text>
        </View>

        <View style={styles.stampGrid}>
          {NEIGHBORHOODS.map((n) => <NeighborhoodStamp key={n.id} n={n} />)}
        </View>

        {/* ── Badges ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <Text style={styles.sectionSub}>{BADGES.filter((b) => b.earned).length} earned</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesRow}
        >
          {BADGES.map((b) => <BadgeCard key={b.id} badge={b} />)}
        </ScrollView>

        {/* ── How to earn stamps ── */}
        <View style={styles.howToCard}>
          <Text style={styles.howToTitle}>How to earn stamps</Text>
          {[
            { icon: 'location' as const, text: 'Check in during happy hour at any verified spot' },
            { icon: 'star' as const, text: 'Leave a review for bonus points' },
            { icon: 'people' as const, text: 'Bring friends — social check-ins earn 2× stamps' },
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

  scrollContent: { paddingBottom: 48 },

  // Level card
  levelCard: {
    margin: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    overflow: 'hidden',
  },
  levelCardInner: { flexDirection: 'row', alignItems: 'flex-start', padding: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.xl },
  levelLeft: {},
  levelLabel: { fontFamily: FONTS.dmMedium, fontSize: 11, color: COLORS.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
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
  stampGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.lg },
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
  stampProgressBar: { width: '100%', height: 4, backgroundColor: COLORS.overlay.inputBg, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  stampProgressFill: { height: '100%', borderRadius: 2 },
  stampCount: { fontFamily: FONTS.dmMedium, fontSize: 11 },
  stampLockLabel: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },

  // Badges
  badgesRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.sm, marginBottom: SPACING.lg },
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
  howToIconBg: { width: 32, height: 32, borderRadius: RADIUS.sm, backgroundColor: COLORS.overlay.orange15, alignItems: 'center', justifyContent: 'center' },
  howToText: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted, flex: 1, lineHeight: 18 },

  // Auth gate
  gateContent: { alignItems: 'center', padding: SPACING.xl, paddingBottom: 60 },
  gateIconArea: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl, marginTop: SPACING.xl },
  gateEmoji: { fontSize: 56 },
  gateTitle: { fontFamily: FONTS.playfair, fontSize: 26, color: COLORS.cream, marginBottom: SPACING.sm, textAlign: 'center' },
  gateSub: { fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl, justifyContent: 'center' },
  previewChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1 },
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
