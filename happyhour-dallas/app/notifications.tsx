import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifType = 'deal' | 'checkin' | 'reminder' | 'reward' | string;

interface DBNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  data: { restaurant_id?: string } | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  deal:     { icon: 'pricetag-outline', color: COLORS.orange,           bg: 'rgba(255,107,26,0.15)' },
  checkin:  { icon: 'people-outline',   color: '#0A84FF',               bg: 'rgba(10,132,255,0.15)' },
  reminder: { icon: 'alarm-outline',    color: COLORS.amber,            bg: 'rgba(255,179,71,0.15)' },
  reward:   { icon: 'ribbon-outline',   color: COLORS.gold,             bg: 'rgba(232,168,48,0.15)' },
  default:  { icon: 'notifications-outline', color: COLORS.muted,       bg: COLORS.overlay.inputBg  },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Row component ────────────────────────────────────────────────────────────

function NotifRow({ item, onPress }: { item: DBNotification; onPress: () => void }) {
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.default;
  const restaurantId = item.data?.restaurant_id;

  return (
    <TouchableOpacity
      style={[styles.row, !item.is_read && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {!item.is_read && <View style={styles.unreadDot} />}
      <View style={[styles.iconBg, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, !item.is_read && styles.rowTitleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.rowTime}>{relativeTime(item.created_at)}</Text>
      </View>
      {restaurantId && (
        <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const [notifs, setNotifs] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifs = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifs((data ?? []) as DBNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifs();
    setRefreshing(false);
  }, [fetchNotifs]);

  const markAllRead = async () => {
    if (!user) return;
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  };

  const handlePress = async (item: DBNotification) => {
    if (!item.is_read) {
      setNotifs((prev) => prev.map((n) => n.id === item.id ? { ...n, is_read: true } : n));
      await supabase.from('notifications').update({ is_read: true }).eq('id', item.id);
    }
    const restaurantId = item.data?.restaurant_id;
    if (restaurantId) {
      router.push({ pathname: '/restaurant/[id]', params: { id: restaurantId } });
    }
  };

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markRead}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <View style={styles.unreadBannerDot} />
          <Text style={styles.unreadBannerText}>{unreadCount} unread</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={COLORS.orange} />
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotifRow item={item} onPress={() => handlePress(item)} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyBody}>
                {user
                  ? "We'll notify you when deals go live near you."
                  : "Sign in to receive deal alerts and reminders."}
              </Text>
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
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  headerTitle: { fontFamily: FONTS.playfair, fontSize: 22, color: COLORS.cream },
  markRead: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.orange, width: 80, textAlign: 'right' },

  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.overlay.orange10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  unreadBannerDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: COLORS.orange },
  unreadBannerText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.orange },

  list: { paddingVertical: SPACING.sm, flexGrow: 1 },
  separator: { height: 1, backgroundColor: COLORS.border.subtle, marginLeft: 72 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  rowUnread: { backgroundColor: 'rgba(255,107,26,0.04)' },
  unreadDot: {
    position: 'absolute',
    left: 8,
    top: '50%',
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.orange,
    marginTop: -3,
  },
  iconBg: {
    width: 44, height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: { flex: 1 },
  rowTitle: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted, marginBottom: 2 },
  rowTitleUnread: { fontFamily: FONTS.dmMedium, color: COLORS.cream },
  rowBody: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted, lineHeight: 18, marginBottom: 4 },
  rowTime: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.faded },

  empty: { flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: SPACING.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.lg },
  emptyTitle: { fontFamily: FONTS.playfair, fontSize: 24, color: COLORS.cream, marginBottom: SPACING.sm },
  emptyBody: { fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 22 },
});
