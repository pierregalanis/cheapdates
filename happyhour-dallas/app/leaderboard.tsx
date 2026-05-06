import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
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
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  id: string;
  full_name: string | null;
  points: number;
  level: string;
  rank: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVELS = [
  { name: 'Newcomer',       color: COLORS.muted },
  { name: 'Regular',        color: '#34C759' },
  { name: 'Local Legend',   color: COLORS.amber },
  { name: 'Happy Hour Pro', color: COLORS.orange },
  { name: 'Dallas Icon',    color: '#FF375F' },
];

function levelColor(level: string): string {
  return LEVELS.find((l) => l.name === level)?.color ?? COLORS.muted;
}

function initials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

// ─── Row component ────────────────────────────────────────────────────────────

function LeaderRow({
  entry,
  isMe,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
}) {
  const rankColor = RANK_COLORS[entry.rank];
  const lvlColor = levelColor(entry.level);
  const displayName = entry.full_name ?? 'Anonymous';

  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      {/* Rank */}
      <View style={styles.rankWrap}>
        {rankColor ? (
          <Ionicons name="trophy" size={18} color={rankColor} />
        ) : (
          <Text style={[styles.rankNum, entry.rank <= 10 && { color: COLORS.orange }]}>
            {entry.rank}
          </Text>
        )}
      </View>

      {/* Avatar */}
      <View style={[styles.avatar, isMe && styles.avatarMe]}>
        <Text style={styles.avatarText}>{initials(entry.full_name)}</Text>
      </View>

      {/* Name + level */}
      <View style={styles.nameWrap}>
        <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
          {isMe ? `${displayName} (you)` : displayName}
        </Text>
        <View style={[styles.levelPill, { borderColor: lvlColor + '40', backgroundColor: lvlColor + '15' }]}>
          <Text style={[styles.levelText, { color: lvlColor }]}>{entry.level}</Text>
        </View>
      </View>

      {/* Points */}
      <Text style={[styles.points, isMe && { color: COLORS.orange }]}>
        {entry.points.toLocaleString()}
        <Text style={styles.ptsSuffix}> pts</Text>
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const { user, profile } = useAuthStore();

  const [tab, setTab] = useState<'all' | 'friends'>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [noFriends, setNoFriends] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    if (tab === 'friends' && user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      const friendIds = (followData ?? []).map((f) => f.following_id);
      if (!friendIds.length) {
        setNoFriends(true);
        setEntries([]);
        setMyEntry(null);
        setLoading(false);
        return;
      }
      setNoFriends(false);
      const allIds = [user.id, ...friendIds];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, points, level')
        .in('id', allIds)
        .order('points', { ascending: false });
      const ranked: LeaderboardEntry[] = (data ?? []).map((p, i) => ({ ...p, rank: i + 1 }));
      setEntries(ranked);
      setMyEntry(ranked.find((e) => e.id === user.id) ?? null);
      setMyRank(null);
    } else {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, points, level')
        .order('points', { ascending: false })
        .limit(50);

      const ranked: LeaderboardEntry[] = (data ?? []).map((p, i) => ({ ...p, rank: i + 1 }));
      setEntries(ranked);
      setNoFriends(false);

      if (user) {
        const inTop = ranked.find((e) => e.id === user.id);
        if (inTop) {
          setMyEntry(inTop);
          setMyRank(inTop.rank);
        } else {
          const pts = profile?.points ?? 0;
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gt('points', pts);
          const rank = (count ?? 0) + 1;
          setMyRank(rank);
          setMyEntry({ id: user.id, full_name: profile?.full_name ?? null, points: pts, level: profile?.level ?? 'Newcomer', rank });
        }
      }
    }

    setLoading(false);
  }, [user?.id, profile?.points, tab]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const showMyBanner = myEntry && myRank !== null && myRank > 50;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <Text style={styles.headerSub}>Dallas's top happy hour explorers</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Everyone / Friends tabs */}
      <View style={styles.tabRow}>
        {(['all', 'friends'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabPill, tab === t && styles.tabPillActive]}
            onPress={() => setTab(t)}
          >
            <Ionicons
              name={t === 'all' ? 'earth-outline' : 'people-outline'}
              size={14}
              color={tab === t ? COLORS.orange : COLORS.muted}
            />
            <Text style={[styles.tabPillText, tab === t && styles.tabPillTextActive]}>
              {t === 'all' ? 'Everyone' : 'Friends'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Podium strip */}
      {!loading && entries.length >= 3 && tab === 'all' && (
        <LinearGradient
          colors={['rgba(232,168,48,0.14)', 'transparent']}
          style={styles.podiumStrip}
        >
          {[1, 0, 2].map((idx) => {
            const e = entries[idx];
            const colors = { 0: '#FFD700', 1: '#C0C0C0', 2: '#CD7F32' };
            const color = colors[idx as 0 | 1 | 2];
            const heights = { 0: 68, 1: 52, 2: 44 };
            return (
              <View key={e.id} style={styles.podiumCol}>
                <Text style={styles.podiumInitials}>{initials(e.full_name)}</Text>
                <Text style={[styles.podiumName, { color }]} numberOfLines={1}>
                  {e.full_name?.split(' ')[0] ?? 'User'}
                </Text>
                <Text style={styles.podiumPts}>{e.points.toLocaleString()} pts</Text>
                <View style={[styles.podiumBase, { height: heights[idx as 0 | 1 | 2], backgroundColor: color + '22', borderColor: color + '55' }]}>
                  <Ionicons name="trophy" size={20} color={color} />
                  <Text style={[styles.podiumRank, { color }]}>{e.rank}</Text>
                </View>
              </View>
            );
          })}
        </LinearGradient>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.orange} />
        </View>
      ) : noFriends ? (
        <View style={styles.loadingWrap}>
          <Ionicons name="people-outline" size={48} color={COLORS.muted} />
          <Text style={[styles.empty, { marginTop: SPACING.md }]}>Follow friends to compare scores</Text>
          <TouchableOpacity style={styles.findFriendsBtn} onPress={() => router.push('/friends' as any)}>
            <Text style={styles.findFriendsBtnText}>Find Friends</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <LeaderRow entry={item} isMe={item.id === user?.id} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} colors={[COLORS.orange]} />
          }
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No rankings yet. Start checking in!</Text>
          }
          ListFooterComponent={
            showMyBanner && myEntry ? (
              <View style={styles.myBanner}>
                <View style={styles.myBannerDivider}>
                  <View style={styles.myBannerLine} />
                  <Text style={styles.myBannerLabel}>Your rank</Text>
                  <View style={styles.myBannerLine} />
                </View>
                <LeaderRow entry={myEntry} isMe />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: FONTS.playfair, fontSize: 22, color: COLORS.cream },
  headerSub: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, marginTop: 2 },

  // Podium
  podiumStrip: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  podiumCol: { flex: 1, alignItems: 'center', gap: 4 },
  podiumInitials: { fontSize: 28 },
  podiumName: { fontFamily: FONTS.dmMedium, fontSize: 12, textAlign: 'center' },
  podiumPts: { fontFamily: FONTS.dmRegular, fontSize: 10, color: COLORS.muted },
  podiumBase: {
    width: '100%', borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: SPACING.sm,
  },
  podiumRank: { fontFamily: FONTS.playfair, fontSize: 20 },

  tabRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border.subtle,
  },
  tabPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  tabPillActive: { backgroundColor: COLORS.overlay.orange10, borderColor: COLORS.border.default },
  tabPillText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.muted },
  tabPillTextActive: { color: COLORS.orange },

  findFriendsBtn: {
    marginTop: SPACING.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    backgroundColor: COLORS.orange, borderRadius: RADIUS.full,
    shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  findFriendsBtnText: { fontFamily: FONTS.dmMedium, fontSize: 14, color: '#fff' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingVertical: SPACING.sm, paddingBottom: 32 },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  rowMe: { backgroundColor: 'rgba(255,107,26,0.07)' },
  rankWrap: { width: 28, alignItems: 'center' },
  rankNum: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.muted },

  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  avatarMe: {
    backgroundColor: COLORS.overlay.orange15,
    borderColor: COLORS.orange,
  },
  avatarText: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.cream },

  nameWrap: { flex: 1, gap: 3 },
  name: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.cream },
  nameMe: { color: COLORS.orange },
  levelPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  levelText: { fontFamily: FONTS.dmMedium, fontSize: 10 },

  points: { fontFamily: FONTS.playfair, fontSize: 17, color: COLORS.cream },
  ptsSuffix: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },

  sep: { height: 1, backgroundColor: COLORS.border.subtle, marginLeft: 76 },
  empty: {
    fontFamily: FONTS.dmRegular, fontSize: 14,
    color: COLORS.muted, textAlign: 'center',
    paddingVertical: SPACING.xl,
  },

  // My banner (when outside top 50)
  myBanner: { paddingTop: SPACING.sm },
  myBannerDivider: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, gap: SPACING.md, marginBottom: SPACING.sm,
  },
  myBannerLine: { flex: 1, height: 1, backgroundColor: COLORS.border.subtle },
  myBannerLabel: { fontFamily: FONTS.dmMedium, fontSize: 11, color: COLORS.muted, letterSpacing: 0.6 },
});
