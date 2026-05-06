import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  TextInput, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FriendProfile {
  id: string;
  full_name: string | null;
  level: string | null;
  points: number;
}

type Tab = 'search' | 'following' | 'followers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function levelColor(level: string | null): string {
  const map: Record<string, string> = {
    Newcomer: COLORS.muted,
    Regular: '#34C759',
    'Local Legend': COLORS.amber,
    'Happy Hour Pro': COLORS.orange,
    'Dallas Icon': '#FF375F',
  };
  return map[level ?? ''] ?? COLORS.muted;
}

// ─── Profile row ──────────────────────────────────────────────────────────────

function ProfileRow({
  profile,
  isMe,
  following,
  onToggle,
  toggling,
}: {
  profile: FriendProfile;
  isMe: boolean;
  following: boolean;
  onToggle: () => void;
  toggling: boolean;
}) {
  const lc = levelColor(profile.level);
  return (
    <View style={row.container}>
      <View style={row.avatar}>
        <Text style={row.avatarText}>{initials(profile.full_name)}</Text>
      </View>
      <View style={row.info}>
        <Text style={row.name} numberOfLines={1}>
          {profile.full_name ?? 'Anonymous'}{isMe ? ' (you)' : ''}
        </Text>
        <View style={[row.levelPill, { borderColor: lc + '50', backgroundColor: lc + '18' }]}>
          <Text style={[row.levelText, { color: lc }]}>{profile.level ?? 'Newcomer'}</Text>
          <Text style={row.pts}> · {profile.points.toLocaleString()} pts</Text>
        </View>
      </View>
      {!isMe && (
        <TouchableOpacity
          style={[row.btn, following ? row.btnFollowing : row.btnFollow]}
          onPress={onToggle}
          disabled={toggling}
          activeOpacity={0.75}
        >
          {toggling ? (
            <ActivityIndicator size="small" color={following ? COLORS.muted : '#fff'} />
          ) : (
            <Text style={[row.btnText, following ? row.btnFollowingText : row.btnFollowText]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FriendsScreen() {
  const { user } = useAuthStore();

  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [following, setFollowing] = useState<FriendProfile[]>([]);
  const [followers, setFollowers] = useState<FriendProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch the set of IDs the current user follows (drives button state everywhere)
  const loadFollowingIds = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
    setFollowingIds(new Set((data ?? []).map((f) => f.following_id)));
  }, [user?.id]);

  // Fetch following list (for the Following tab)
  const loadFollowing = useCallback(async () => {
    if (!user) return;
    const { data: fData } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
    const ids = (fData ?? []).map((f) => f.following_id);
    if (!ids.length) { setFollowing([]); return; }
    const { data } = await supabase.from('profiles').select('id, full_name, level, points').in('id', ids).order('points', { ascending: false });
    setFollowing((data ?? []) as FriendProfile[]);
  }, [user?.id]);

  // Fetch followers list (for the Followers tab)
  const loadFollowers = useCallback(async () => {
    if (!user) return;
    const { data: fData } = await supabase.from('follows').select('follower_id').eq('following_id', user.id);
    const ids = (fData ?? []).map((f) => f.follower_id);
    if (!ids.length) { setFollowers([]); return; }
    const { data } = await supabase.from('profiles').select('id, full_name, level, points').in('id', ids).order('points', { ascending: false });
    setFollowers((data ?? []) as FriendProfile[]);
  }, [user?.id]);

  useEffect(() => {
    loadFollowingIds();
  }, [loadFollowingIds]);

  useEffect(() => {
    if (tab === 'following') {
      setListLoading(true);
      loadFollowing().finally(() => setListLoading(false));
    } else if (tab === 'followers') {
      setListLoading(true);
      loadFollowers().finally(() => setListLoading(false));
    }
  }, [tab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFollowingIds(), tab === 'following' ? loadFollowing() : loadFollowers()]);
    setRefreshing(false);
  };

  // Debounced search
  const handleSearch = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, level, points')
        .ilike('full_name', `%${text.trim()}%`)
        .limit(20);
      setSearchResults((data ?? []) as FriendProfile[]);
      setSearching(false);
    }, 350);
  };

  const toggleFollow = async (targetId: string) => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setToggling((prev) => new Set([...prev, targetId]));

    const isFollowing = followingIds.has(targetId);
    if (isFollowing) {
      setFollowingIds((prev) => { const s = new Set(prev); s.delete(targetId); return s; });
      await supabase.from('follows').delete().match({ follower_id: user.id, following_id: targetId });
      setFollowing((prev) => prev.filter((p) => p.id !== targetId));
    } else {
      setFollowingIds((prev) => new Set([...prev, targetId]));
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
    }

    setToggling((prev) => { const s = new Set(prev); s.delete(targetId); return s; });
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'search',    label: 'Find' },
    { key: 'following', label: 'Following' },
    { key: 'followers', label: 'Followers' },
  ];

  const listData = tab === 'following' ? following : followers;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search tab */}
      {tab === 'search' && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={COLORS.muted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name…"
              placeholderTextColor={COLORS.faded}
              value={query}
              onChangeText={handleSearch}
              returnKeyType="search"
              keyboardAppearance="dark"
              autoFocus
            />
            {searching && <ActivityIndicator size="small" color={COLORS.orange} style={{ marginRight: SPACING.md }} />}
          </View>
          <FlatList
            data={searchResults}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => (
              <ProfileRow
                profile={item}
                isMe={item.id === user?.id}
                following={followingIds.has(item.id)}
                onToggle={() => toggleFollow(item.id)}
                toggling={toggling.has(item.id)}
              />
            )}
            ListEmptyComponent={
              query.length > 0 && !searching ? (
                <View style={styles.emptyState}>
                  <Ionicons name="person-outline" size={36} color={COLORS.muted} />
                  <Text style={styles.emptyText}>No users found for "{query}"</Text>
                </View>
              ) : query.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={36} color={COLORS.muted} />
                  <Text style={styles.emptyText}>Search for friends by name</Text>
                </View>
              ) : null
            }
          />
        </View>
      )}

      {/* Following / Followers tabs */}
      {tab !== 'search' && (
        listLoading ? (
          <View style={styles.centered}><ActivityIndicator color={COLORS.orange} /></View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />
            }
            renderItem={({ item }) => (
              <ProfileRow
                profile={item}
                isMe={item.id === user?.id}
                following={followingIds.has(item.id)}
                onToggle={() => toggleFollow(item.id)}
                toggling={toggling.has(item.id)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={36} color={COLORS.muted} />
                <Text style={styles.emptyText}>
                  {tab === 'following' ? "You're not following anyone yet." : 'Nobody is following you yet.'}
                </Text>
                {tab === 'following' && (
                  <TouchableOpacity onPress={() => setTab('search')}>
                    <Text style={styles.emptyLink}>Find friends →</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border.subtle,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  headerTitle: { fontFamily: FONTS.playfair, fontSize: 22, color: COLORS.cream },

  tabsRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border.subtle,
  },
  tab: {
    flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  tabActive: { backgroundColor: COLORS.overlay.orange10, borderColor: COLORS.border.default },
  tabText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.muted },
  tabTextActive: { color: COLORS.orange },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.lg, marginVertical: SPACING.md,
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border.default,
  },
  searchIcon: { marginLeft: SPACING.md },
  searchInput: {
    flex: 1, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.md,
    fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.cream,
  },

  list: { paddingVertical: SPACING.sm, paddingBottom: 40 },
  sep: { height: 1, backgroundColor: COLORS.border.subtle, marginLeft: 68 },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: SPACING.sm },
  emptyText: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted, textAlign: 'center' },
  emptyLink: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.orange, marginTop: SPACING.xs },
});

const row = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  avatarText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.cream },
  info: { flex: 1, gap: 4 },
  name: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.cream },
  levelPill: {
    flexDirection: 'row', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  levelText: { fontFamily: FONTS.dmMedium, fontSize: 11 },
  pts: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },
  btn: {
    paddingHorizontal: SPACING.md, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1,
    minWidth: 84, alignItems: 'center',
  },
  btnFollow: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  btnFollowing: { backgroundColor: COLORS.overlay.inputBg, borderColor: COLORS.border.default },
  btnText: { fontFamily: FONTS.dmMedium, fontSize: 13 },
  btnFollowText: { color: '#fff' },
  btnFollowingText: { color: COLORS.muted },
});
