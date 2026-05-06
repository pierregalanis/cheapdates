import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal, TextInput,
  StyleSheet, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  name: string;
  neighborhood: string | null;
  average_rating: number;
  review_count: number;
  is_verified: boolean;
  crowd_level: number;
  checkinsThisWeek: number;
  todayHours: { start_time: string; end_time: string; label: string | null }[];
  recentReviews: { id: string; rating: number; body: string | null; restaurant_reply: string | null; created_at: string; profiles: { full_name: string | null } | null }[];
  todayReservations: { id: string; guest_name: string; party_size: number; reservation_time: string; status: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CROWD_OPTIONS = [
  { level: 0, label: 'Empty',    color: '#8E8E93' },
  { level: 1, label: 'Quiet',    color: '#34C759' },
  { level: 2, label: 'Moderate', color: '#FF9F0A' },
  { level: 3, label: 'Busy',     color: '#FF6B1A' },
  { level: 4, label: 'Packed',   color: '#FF3B30' },
];

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const hour12 = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const { ownedRestaurant, fetchOwnedRestaurant, user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingCrowd, setUpdatingCrowd] = useState(false);
  const [crowdLevel, setCrowdLevel] = useState(ownedRestaurant?.crowd_level ?? 0);
  const [replyModal, setReplyModal] = useState<{ reviewId: string; existing: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  const restaurantId = ownedRestaurant?.id;

  const fetchData = useCallback(async () => {
    if (!restaurantId) return;

    const todayDow = new Date().getDay();

    const todayDate = new Date().toISOString().split('T')[0];

    const [restaurantRes, checkinsRes, hoursRes, reviewsRes, reservationsRes] = await Promise.all([
      supabase
        .from('restaurants')
        .select('name, neighborhood, average_rating, review_count, is_verified, crowd_level')
        .eq('id', restaurantId)
        .single(),
      supabase
        .from('checkins')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase
        .from('happy_hours')
        .select('start_time, end_time, label')
        .eq('restaurant_id', restaurantId)
        .eq('day_of_week', todayDow)
        .eq('is_active', true),
      supabase
        .from('reviews')
        .select('id, rating, body, restaurant_reply, created_at, profiles(full_name)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('reservations')
        .select('id, guest_name, party_size, reservation_time, status')
        .eq('restaurant_id', restaurantId)
        .eq('reservation_date', todayDate)
        .neq('status', 'cancelled')
        .order('reservation_time', { ascending: true }),
    ]);

    if (restaurantRes.data) {
      setCrowdLevel(restaurantRes.data.crowd_level);
      setData({
        ...restaurantRes.data,
        checkinsThisWeek: checkinsRes.count ?? 0,
        todayHours: hoursRes.data ?? [],
        recentReviews: (reviewsRes.data ?? []) as unknown as DashboardData['recentReviews'],
        todayReservations: (reservationsRes.data ?? []) as DashboardData['todayReservations'],
      });
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const openReply = (reviewId: string, existing: string | null) => {
    setReplyText(existing ?? '');
    setReplyModal({ reviewId, existing: existing ?? '' });
  };

  const saveReply = async () => {
    if (!replyModal || !restaurantId) return;
    setSavingReply(true);
    const reply = replyText.trim() || null;
    await supabase.from('reviews').update({ restaurant_reply: reply }).eq('id', replyModal.reviewId);
    setData((prev) =>
      prev
        ? {
            ...prev,
            recentReviews: prev.recentReviews.map((r) =>
              r.id === replyModal.reviewId ? { ...r, restaurant_reply: reply } : r
            ),
          }
        : prev
    );
    setSavingReply(false);
    setReplyModal(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const updateCrowd = async (level: number) => {
    if (!restaurantId || updatingCrowd) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCrowdLevel(level);
    setUpdatingCrowd(true);
    await supabase
      .from('restaurants')
      .update({ crowd_level: level, crowd_updated_at: new Date().toISOString() })
      .eq('id', restaurantId);
    setUpdatingCrowd(false);
    if (user) fetchOwnedRestaurant(user.id);
  };

  const activeCrowd = CROWD_OPTIONS[crowdLevel];

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restaurant Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.orange} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restaurant Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load restaurant data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{data.name}</Text>
        {data.is_verified ? (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.orange} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        ) : <View style={{ width: 40 }} />}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />
        }
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { icon: 'star', value: data.average_rating.toFixed(1), label: 'Avg Rating', color: COLORS.gold },
            { icon: 'chatbubble-outline', value: String(data.review_count), label: 'Reviews', color: COLORS.orange },
            { icon: 'location-outline', value: String(data.checkinsThisWeek), label: 'Check-ins (7d)', color: COLORS.status.success },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Ionicons name={s.icon as any} size={16} color={s.color} style={{ marginBottom: 4 }} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Crowd level */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live Crowd Level</Text>
            {updatingCrowd && <ActivityIndicator size="small" color={COLORS.orange} />}
          </View>
          <View style={styles.crowdCard}>
            <View style={styles.crowdCurrentRow}>
              <View style={[styles.crowdDot, { backgroundColor: activeCrowd.color }]} />
              <Text style={[styles.crowdCurrentLabel, { color: activeCrowd.color }]}>
                {activeCrowd.label}
              </Text>
              <Text style={styles.crowdHint}>· visible to all users</Text>
            </View>
            <View style={styles.crowdBtns}>
              {CROWD_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.level}
                  style={[
                    styles.crowdBtn,
                    crowdLevel === opt.level && { backgroundColor: opt.color + '22', borderColor: opt.color },
                  ]}
                  onPress={() => updateCrowd(opt.level)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.crowdBtnDot, { backgroundColor: opt.color }]} />
                  <Text style={[
                    styles.crowdBtnLabel,
                    crowdLevel === opt.level && { color: opt.color },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Manage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage</Text>
          <View style={styles.manageGrid}>
            {[
              { icon: 'time-outline',       label: 'Happy Hours',  sub: 'Times & days',      route: '/owner/happy-hours'  },
              { icon: 'restaurant-outline', label: 'Menu Items',   sub: 'Prices & specials',  route: '/owner/menu'         },
              { icon: 'pricetag-outline',   label: 'Deals',        sub: 'Limited offers',     route: '/owner/deals'        },
              { icon: 'calendar-outline',   label: 'Reservations', sub: 'Bookings & status',  route: '/owner/reservations' },
              { icon: 'create-outline',     label: 'Info',         sub: 'Details & tags',     route: '/owner/info'         },
            ].map((item) => (
              <TouchableOpacity
                key={item.route}
                style={styles.manageCard}
                activeOpacity={0.75}
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.manageIconBg}>
                  <Ionicons name={item.icon as any} size={20} color={COLORS.orange} />
                </View>
                <Text style={styles.manageLabel}>{item.label}</Text>
                <Text style={styles.manageSub}>{item.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Today's reservations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Reservations</Text>
            <TouchableOpacity onPress={() => router.push('/owner/reservations' as any)}>
              <Text style={styles.editLink}>View all →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {data.todayReservations.length === 0 ? (
              <View style={styles.hhRow}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
                <Text style={styles.noHhText}>No reservations today</Text>
              </View>
            ) : (
              data.todayReservations.map((r, i) => {
                const statusColors: Record<string, string> = {
                  pending: COLORS.amber, confirmed: COLORS.status.success,
                  no_show: COLORS.muted, cancelled: COLORS.status.error,
                };
                return (
                  <View key={r.id} style={[styles.hhRow, i > 0 && { borderTopWidth: 1, borderTopColor: COLORS.border.subtle }]}>
                    <View style={[styles.hhActiveDot, { backgroundColor: statusColors[r.status] ?? COLORS.muted }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.hhTime}>{r.guest_name}</Text>
                      <Text style={styles.hhLabel}>Party of {r.party_size} · {formatTime(r.reservation_time)}</Text>
                    </View>
                    <View style={[{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, backgroundColor: (statusColors[r.status] ?? COLORS.muted) + '18' }]}>
                      <Text style={[{ fontFamily: FONTS.dmMedium, fontSize: 10, color: statusColors[r.status] ?? COLORS.muted }]}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Today's happy hours */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Happy Hours</Text>
            <TouchableOpacity onPress={() => router.push('/owner/happy-hours' as any)}>
              <Text style={styles.editLink}>Edit →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {data.todayHours.length > 0 ? data.todayHours.map((hh, i) => (
              <View key={i} style={[styles.hhRow, i > 0 && { borderTopWidth: 1, borderTopColor: COLORS.border.subtle }]}>
                <View style={styles.hhActiveDot} />
                <View style={{ flex: 1 }}>
                  {hh.label && <Text style={styles.hhLabel}>{hh.label}</Text>}
                  <Text style={styles.hhTime}>
                    {formatTime(hh.start_time)} – {formatTime(hh.end_time)}
                  </Text>
                </View>
              </View>
            )) : (
              <View style={styles.hhRow}>
                <Ionicons name="moon-outline" size={16} color={COLORS.muted} />
                <Text style={styles.noHhText}>No happy hour scheduled today</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recent reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
          </View>
          {data.recentReviews.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.noHhText}>No reviews yet — share your listing to get started.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {data.recentReviews.map((review, i) => (
                <View key={review.id} style={[styles.reviewRow, i > 0 && { borderTopWidth: 1, borderTopColor: COLORS.border.subtle }]}>
                  <View style={styles.reviewTop}>
                    <View style={styles.reviewStars}>
                      {[1,2,3,4,5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= review.rating ? 'star' : 'star-outline'}
                          size={12}
                          color={COLORS.gold}
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewMeta}>
                      {review.profiles?.full_name ?? 'Anonymous'} · {timeAgo(review.created_at)}
                    </Text>
                  </View>
                  {review.body ? (
                    <Text style={styles.reviewBody} numberOfLines={3}>{review.body}</Text>
                  ) : null}
                  {review.restaurant_reply ? (
                    <View style={styles.replyPreview}>
                      <Ionicons name="business-outline" size={11} color={COLORS.orange} />
                      <Text style={styles.replyPreviewText} numberOfLines={2}>{review.restaurant_reply}</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={styles.replyBtn}
                    onPress={() => openReply(review.id, review.restaurant_reply)}
                  >
                    <Ionicons name="chatbubble-outline" size={13} color={COLORS.orange} />
                    <Text style={styles.replyBtnText}>
                      {review.restaurant_reply ? 'Edit Reply' : 'Reply'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Reply modal */}
      <Modal visible={!!replyModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.replyModalSheet}>
            <Text style={styles.replyModalTitle}>Reply to Review</Text>
            <TextInput
              style={styles.replyInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Thank the guest or address their feedback…"
              placeholderTextColor={COLORS.faded}
              multiline
              numberOfLines={4}
              keyboardAppearance="dark"
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.replyModalBtns}>
              <TouchableOpacity
                style={styles.replyCancelBtn}
                onPress={() => setReplyModal(null)}
              >
                <Text style={styles.replyCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.replySaveBtn, savingReply && { opacity: 0.6 }]}
                onPress={saveReply}
                disabled={savingReply}
              >
                {savingReply
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.replySaveText}>Post Reply</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.muted },

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
  headerTitle: { fontFamily: FONTS.playfair, fontSize: 20, color: COLORS.cream, flex: 1, textAlign: 'center', marginHorizontal: SPACING.sm },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.overlay.orange10,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border.default,
  },
  verifiedText: { fontFamily: FONTS.dmMedium, fontSize: 11, color: COLORS.orange },

  scroll: { padding: SPACING.lg, paddingBottom: 60, gap: SPACING.xl },

  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statBox: {
    flex: 1, alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg, paddingVertical: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  statValue: { fontFamily: FONTS.playfair, fontSize: 20 },
  statLabel: { fontFamily: FONTS.dmRegular, fontSize: 10, color: COLORS.muted, marginTop: 2, textAlign: 'center' },

  section: { gap: SPACING.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: {
    fontFamily: FONTS.dmMedium, fontSize: 11,
    color: COLORS.muted, letterSpacing: 0.8, textTransform: 'uppercase',
  },

  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border.subtle, overflow: 'hidden',
  },

  crowdCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    padding: SPACING.lg, gap: SPACING.lg,
  },
  crowdCurrentRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  crowdDot: { width: 10, height: 10, borderRadius: 5 },
  crowdCurrentLabel: { fontFamily: FONTS.dmMedium, fontSize: 16 },
  crowdHint: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },
  crowdBtns: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  crowdBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1.5, borderColor: COLORS.border.default,
  },
  crowdBtnDot: { width: 7, height: 7, borderRadius: 99 },
  crowdBtnLabel: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.muted },

  hhRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg },
  hhActiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.status.success },
  hhLabel: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.muted, marginBottom: 2 },
  hhTime: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.cream },
  noHhText: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted, padding: SPACING.lg },

  reviewRow: { padding: SPACING.lg, gap: SPACING.sm },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewMeta: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },
  reviewBody: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.cream, lineHeight: 20 },
  replyPreview: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 5,
    backgroundColor: COLORS.overlay.orange10,
    borderRadius: RADIUS.sm, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border.default,
  },
  replyPreviewText: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, flex: 1, lineHeight: 17 },
  replyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.overlay.orange10,
    borderWidth: 1, borderColor: COLORS.border.default,
  },
  replyBtnText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.orange },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  replyModalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    padding: SPACING.xl, paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },
  replyModalTitle: { fontFamily: FONTS.playfair, fontSize: 20, color: COLORS.cream },
  replyInput: {
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border.default,
    padding: SPACING.md,
    minHeight: 110,
    fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.cream,
    lineHeight: 22,
  },
  replyModalBtns: { flexDirection: 'row', gap: SPACING.sm },
  replyCancelBtn: {
    flex: 1, height: 48, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1, borderColor: COLORS.border.default,
  },
  replyCancelText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.muted },
  replySaveBtn: {
    flex: 2, height: 48, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.orange,
    shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  replySaveText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: '#fff' },

  editLink: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.orange },

  manageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  manageCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    padding: SPACING.lg, gap: 6,
  },
  manageIconBg: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.orange10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.default,
    marginBottom: 4,
  },
  manageLabel: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.cream },
  manageSub: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },
});
