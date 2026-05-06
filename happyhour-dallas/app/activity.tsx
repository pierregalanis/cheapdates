import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  type: 'checkin' | 'review';
  user_id: string;
  user_name: string | null;
  restaurant_id: string;
  restaurant_name: string;
  neighborhood: string | null;
  points_earned?: number;
  rating?: number;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'This Week';
  return 'Earlier';
}

// ─── Activity card ────────────────────────────────────────────────────────────

function ActivityCard({ item }: { item: ActivityItem }) {
  const isCheckin = item.type === 'checkin';
  return (
    <TouchableOpacity
      style={card.container}
      activeOpacity={0.78}
      onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: item.restaurant_id } })}
    >
      {/* Avatar */}
      <View style={card.avatar}>
        <Text style={card.avatarText}>{initials(item.user_name)}</Text>
      </View>

      {/* Content */}
      <View style={card.content}>
        <Text style={card.text} numberOfLines={2}>
          <Text style={card.userName}>{item.user_name ?? 'Someone'}</Text>
          {isCheckin ? ' checked in at ' : ' reviewed '}
          <Text style={card.restaurantName}>{item.restaurant_name}</Text>
        </Text>

        <View style={card.meta}>
          {isCheckin && item.points_earned ? (
            <View style={card.badge}>
              <Ionicons name="location" size={11} color={COLORS.status.success} />
              <Text style={[card.badgeText, { color: COLORS.status.success }]}>+{item.points_earned} pts</Text>
            </View>
          ) : null}
          {!isCheckin && item.rating ? (
            <View style={card.badge}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons key={s} name={s <= item.rating! ? 'star' : 'star-outline'} size={11} color={COLORS.gold} />
              ))}
            </View>
          ) : null}
          {item.neighborhood ? (
            <Text style={card.neighborhood}>{item.neighborhood}</Text>
          ) : null}
          <Text style={card.time}>{timeAgo(item.created_at)}</Text>
        </View>
      </View>

      {/* Type icon */}
      <View style={[card.typeIcon, isCheckin ? card.typeIconCheckin : card.typeIconReview]}>
        <Ionicons
          name={isCheckin ? 'location' : 'star'}
          size={14}
          color={isCheckin ? COLORS.status.success : COLORS.gold}
        />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [noFriends, setNoFriends] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;

    // 1 — Get following IDs
    const { data: followData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const friendIds = (followData ?? []).map((f) => f.following_id);
    if (!friendIds.length) {
      setNoFriends(true);
      setItems([]);
      return;
    }
    setNoFriends(false);

    // 2 — Fetch their recent check-ins and reviews in parallel
    const [checkinsRes, reviewsRes] = await Promise.all([
      supabase
        .from('checkins')
        .select('id, user_id, restaurant_id, points_earned, created_at, profiles(full_name), restaurants(name, neighborhood)')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('reviews')
        .select('id, user_id, restaurant_id, rating, created_at, profiles(full_name), restaurants(name, neighborhood)')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    const checkinItems: ActivityItem[] = (checkinsRes.data ?? []).map((c: any) => ({
      id: `c_${c.id}`,
      type: 'checkin',
      user_id: c.user_id,
      user_name: c.profiles?.full_name ?? null,
      restaurant_id: c.restaurant_id,
      restaurant_name: c.restaurants?.name ?? 'Unknown',
      neighborhood: c.restaurants?.neighborhood ?? null,
      points_earned: c.points_earned,
      created_at: c.created_at,
    }));

    const reviewItems: ActivityItem[] = (reviewsRes.data ?? []).map((r: any) => ({
      id: `r_${r.id}`,
      type: 'review',
      user_id: r.user_id,
      user_name: r.profiles?.full_name ?? null,
      restaurant_id: r.restaurant_id,
      restaurant_name: r.restaurants?.name ?? 'Unknown',
      neighborhood: r.restaurants?.neighborhood ?? null,
      rating: r.rating,
      created_at: r.created_at,
    }));

    // 3 — Merge and sort newest first
    const merged = [...checkinItems, ...reviewItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setItems(merged);
  }, [user?.id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Add group headers
  type ListRow = { type: 'header'; label: string } | { type: 'item'; data: ActivityItem };
  const rows: ListRow[] = [];
  let lastGroup = '';
  for (const item of items) {
    const group = groupLabel(item.created_at);
    if (group !== lastGroup) {
      rows.push({ type: 'header', label: group });
      lastGroup = group;
    }
    rows.push({ type: 'item', data: item });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends Activity</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.orange} /></View>
      ) : noFriends ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={48} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptyText}>Follow people to see their check-ins and reviews here</Text>
          <TouchableOpacity style={styles.findBtn} onPress={() => router.push('/friends' as any)}>
            <Ionicons name="person-add-outline" size={16} color="#fff" />
            <Text style={styles.findBtnText}>Find Friends</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r, i) => r.type === 'header' ? `h_${r.label}` : r.data.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />
          }
          renderItem={({ item: r }) => {
            if (r.type === 'header') {
              return <Text style={styles.groupHeader}>{r.label}</Text>;
            }
            return <ActivityCard item={r.data} />;
          }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="time-outline" size={40} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>No recent activity</Text>
              <Text style={styles.emptyText}>Your friends haven't checked in recently</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.xxxl },

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

  list: { paddingTop: SPACING.sm, paddingBottom: 48 },

  groupHeader: {
    fontFamily: FONTS.dmMedium, fontSize: 11,
    color: COLORS.muted, letterSpacing: 0.8, textTransform: 'uppercase',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm,
  },

  emptyTitle: { fontFamily: FONTS.playfair, fontSize: 22, color: COLORS.cream, textAlign: 'center' },
  emptyText: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },

  findBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    borderRadius: RADIUS.full, marginTop: SPACING.md,
    shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  findBtnText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: '#fff' },
});

const card = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border.subtle,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  avatarText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.cream },
  content: { flex: 1, gap: 5 },
  text: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted, lineHeight: 19 },
  userName: { fontFamily: FONTS.dmMedium, color: COLORS.cream },
  restaurantName: { fontFamily: FONTS.dmMedium, color: COLORS.orange },
  meta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  badgeText: { fontFamily: FONTS.dmMedium, fontSize: 11 },
  neighborhood: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },
  time: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },
  typeIcon: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginTop: 2,
  },
  typeIconCheckin: { backgroundColor: 'rgba(52,199,89,0.12)', borderColor: 'rgba(52,199,89,0.30)' },
  typeIconReview: { backgroundColor: 'rgba(232,168,48,0.12)', borderColor: 'rgba(232,168,48,0.30)' },
});
