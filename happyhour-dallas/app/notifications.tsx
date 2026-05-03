import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifType = 'deal' | 'checkin' | 'reminder' | 'reward';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  restaurantId?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_NOTIFS: Notification[] = [
  {
    id: '1',
    type: 'deal',
    title: '🔥 Bottled Blonde deal ending soon',
    body: '$5 cocktails end in 23 minutes — get there!',
    time: '23m ago',
    read: false,
    restaurantId: '1',
  },
  {
    id: '2',
    type: 'checkin',
    title: '👯 Your crew is at Happiest Hour',
    body: '3 friends checked in — happy hour runs until 7:30 PM',
    time: '41m ago',
    read: false,
    restaurantId: '2',
  },
  {
    id: '3',
    type: 'reward',
    title: '🏅 You earned a new stamp!',
    body: 'Deep Ellum Explorer — visit 3 more spots to level up',
    time: '2h ago',
    read: true,
  },
  {
    id: '4',
    type: 'reminder',
    title: '⏰ Happy hour starts soon',
    body: 'Off the Record: $6 cocktails start at 4:00 PM',
    time: '3h ago',
    read: true,
    restaurantId: '3',
  },
  {
    id: '5',
    type: 'deal',
    title: '🌮 New deal at Taco y Vino',
    body: '$3 tacos added to happy hour menu',
    time: 'Yesterday',
    read: true,
    restaurantId: '6',
  },
  {
    id: '6',
    type: 'reward',
    title: '🎉 You reached Level 2!',
    body: 'You\'re now a Regular — unlock exclusive deals',
    time: '2 days ago',
    read: true,
  },
];

const TYPE_CONFIG: Record<NotifType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  deal: { icon: 'pricetag-outline', color: COLORS.orange, bg: 'rgba(255,107,26,0.15)' },
  checkin: { icon: 'people-outline', color: '#0A84FF', bg: 'rgba(10,132,255,0.15)' },
  reminder: { icon: 'alarm-outline', color: COLORS.amber, bg: 'rgba(255,179,71,0.15)' },
  reward: { icon: 'ribbon-outline', color: COLORS.gold, bg: 'rgba(232,168,48,0.15)' },
};

// ─── Components ───────────────────────────────────────────────────────────────

function NotifRow({ item, onPress }: { item: Notification; onPress: () => void }) {
  const cfg = TYPE_CONFIG[item.type];
  return (
    <TouchableOpacity
      style={[styles.row, !item.read && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {!item.read && <View style={styles.unreadDot} />}
      <View style={[styles.iconBg, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, !item.read && styles.rowTitleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.rowTime}>{item.time}</Text>
      </View>
      {item.restaurantId && (
        <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  const unreadCount = notifs.filter((n) => !n.read).length;

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));

  const handlePress = (item: Notification) => {
    setNotifs((prev) => prev.map((n) => n.id === item.id ? { ...n, read: true } : n));
    if (item.restaurantId) {
      router.push({ pathname: '/restaurant/[id]', params: { id: item.restaurantId } });
    }
  };

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

      <FlatList
        data={notifs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotifRow item={item} onPress={() => handlePress(item)} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyBody}>We'll let you know when deals are live near you.</Text>
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
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
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

  list: { paddingVertical: SPACING.sm },
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.orange,
    marginTop: -3,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: { flex: 1 },
  rowTitle: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted, marginBottom: 2 },
  rowTitleUnread: { fontFamily: FONTS.dmMedium, color: COLORS.cream },
  rowBody: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted, lineHeight: 18, marginBottom: 4 },
  rowTime: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.faded },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: SPACING.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.lg },
  emptyTitle: { fontFamily: FONTS.playfair, fontSize: 24, color: COLORS.cream, marginBottom: SPACING.sm },
  emptyBody: { fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 22 },
});
