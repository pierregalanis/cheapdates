import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
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

interface Reservation {
  id: string;
  guest_name: string;
  guest_phone: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  notes: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'no_show';
  confirmation_code: string;
  created_at: string;
}

type FilterTab = 'today' | 'upcoming' | 'all' | 'past';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: '#FFB347', bg: 'rgba(255,179,71,0.12)'  },
  confirmed: { label: 'Confirmed', color: '#34C759', bg: 'rgba(52,199,89,0.12)'   },
  cancelled: { label: 'Cancelled', color: '#FF3B30', bg: 'rgba(255,59,48,0.12)'   },
  no_show:   { label: 'No-show',   color: '#8A6A50', bg: 'rgba(138,106,80,0.12)'  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Reservation Card ─────────────────────────────────────────────────────────

function ReservationCard({
  item,
  onConfirm,
  onCancel,
  onNoShow,
}: {
  item: Reservation;
  onConfirm: () => void;
  onCancel: () => void;
  onNoShow: () => void;
}) {
  const status = STATUS_CONFIG[item.status];
  const isPast = item.reservation_date < todayStr();
  const isActionable = item.status === 'pending' || item.status === 'confirmed';

  return (
    <View style={card.container}>
      {/* Top row */}
      <View style={card.top}>
        <View style={{ flex: 1 }}>
          <Text style={card.name}>{item.guest_name}</Text>
          <Text style={card.meta}>
            {formatDate(item.reservation_date)} · {formatTime(item.reservation_time)} · Party of {item.party_size}
          </Text>
          <Text style={card.phone}>{item.guest_phone}</Text>
        </View>
        <View style={[card.statusPill, { backgroundColor: status.bg, borderColor: status.color + '50' }]}>
          <Text style={[card.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Confirmation code */}
      <View style={card.codeRow}>
        <Ionicons name="ticket-outline" size={13} color={COLORS.muted} />
        <Text style={card.code}>{item.confirmation_code}</Text>
      </View>

      {/* Notes */}
      {item.notes ? (
        <View style={card.notesRow}>
          <Ionicons name="chatbubble-outline" size={13} color={COLORS.muted} />
          <Text style={card.notes} numberOfLines={2}>{item.notes}</Text>
        </View>
      ) : null}

      {/* Actions */}
      {!isPast && isActionable && (
        <View style={card.actions}>
          {item.status === 'pending' && (
            <TouchableOpacity style={[card.actionBtn, card.confirmBtn]} onPress={onConfirm}>
              <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.status.success} />
              <Text style={[card.actionText, { color: COLORS.status.success }]}>Confirm</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[card.actionBtn, card.noShowBtn]} onPress={onNoShow}>
            <Ionicons name="person-remove-outline" size={14} color={COLORS.muted} />
            <Text style={[card.actionText, { color: COLORS.muted }]}>No-show</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[card.actionBtn, card.cancelBtn]} onPress={onCancel}>
            <Ionicons name="close-circle-outline" size={14} color={COLORS.status.error} />
            <Text style={[card.actionText, { color: COLORS.status.error }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OwnerReservationsScreen() {
  const { ownedRestaurant } = useAuthStore();
  const restaurantId = ownedRestaurant?.id ?? '';

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('today');

  const fetchReservations = useCallback(async () => {
    const { data } = await supabase
      .from('reservations')
      .select('id, guest_name, guest_phone, party_size, reservation_date, reservation_time, notes, status, confirmation_code, created_at')
      .eq('restaurant_id', restaurantId)
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true });
    setReservations((data as Reservation[]) ?? []);
  }, [restaurantId]);

  useEffect(() => {
    fetchReservations().finally(() => setLoading(false));
  }, [fetchReservations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

  const updateStatus = async (id: string, status: Reservation['status']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    await supabase.from('reservations').update({ status }).eq('id', id);
  };

  const handleCancel = (r: Reservation) => {
    Alert.alert('Cancel Reservation', `Cancel booking for ${r.guest_name}?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Booking', style: 'destructive', onPress: () => updateStatus(r.id, 'cancelled') },
    ]);
  };

  const today = todayStr();
  const filtered = reservations.filter((r) => {
    if (activeTab === 'today')    return r.reservation_date === today;
    if (activeTab === 'upcoming') return r.reservation_date > today && r.status !== 'cancelled';
    if (activeTab === 'past')     return r.reservation_date < today;
    return true;
  });

  const counts = {
    today:    reservations.filter((r) => r.reservation_date === today).length,
    upcoming: reservations.filter((r) => r.reservation_date > today && r.status !== 'cancelled').length,
    all:      reservations.length,
    past:     reservations.filter((r) => r.reservation_date < today).length,
  };

  const TABS: Array<{ key: FilterTab; label: string }> = [
    { key: 'today',    label: `Today (${counts.today})`    },
    { key: 'upcoming', label: `Upcoming (${counts.upcoming})` },
    { key: 'all',      label: `All (${counts.all})`        },
    { key: 'past',     label: `Past (${counts.past})`      },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reservations</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={COLORS.orange} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />
          }
          ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
          renderItem={({ item }) => (
            <ReservationCard
              item={item}
              onConfirm={() => updateStatus(item.id, 'confirmed')}
              onCancel={() => handleCancel(item)}
              onNoShow={() => updateStatus(item.id, 'no_show')}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>No reservations</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'today' ? "No bookings for today yet." : "Nothing to show here."}
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
  headerTitle: { fontFamily: FONTS.playfair, fontSize: 20, color: COLORS.cream },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border.subtle,
    gap: SPACING.xs,
  },
  tab: {
    flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  tabActive: { backgroundColor: COLORS.overlay.orange10, borderColor: COLORS.border.default },
  tabText: { fontFamily: FONTS.dmMedium, fontSize: 10, color: COLORS.muted },
  tabTextActive: { color: COLORS.orange },

  list: { padding: SPACING.lg, paddingBottom: 60 },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontFamily: FONTS.playfair, fontSize: 20, color: COLORS.cream },
  emptyText: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted },
});

const card = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border.subtle, padding: SPACING.md, gap: SPACING.sm,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  name: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.cream },
  meta: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, marginTop: 2 },
  phone: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },
  statusPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  statusText: { fontFamily: FONTS.dmMedium, fontSize: 11 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  code: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.orange, letterSpacing: 1 },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  notes: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, flex: 1 },
  actions: {
    flexDirection: 'row', gap: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border.subtle, paddingTop: SPACING.sm,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  confirmBtn: { borderColor: 'rgba(52,199,89,0.30)', backgroundColor: 'rgba(52,199,89,0.08)' },
  noShowBtn:  { borderColor: COLORS.border.subtle,   backgroundColor: COLORS.overlay.inputBg },
  cancelBtn:  { borderColor: 'rgba(255,59,48,0.30)', backgroundColor: 'rgba(255,59,48,0.08)' },
  actionText: { fontFamily: FONTS.dmMedium, fontSize: 12 },
});
