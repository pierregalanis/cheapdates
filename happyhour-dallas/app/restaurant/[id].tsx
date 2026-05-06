import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Animated,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Analytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';
import CrowdMeter, { CROWD_CONFIG } from '@/components/ui/CrowdMeter';
import StarRating from '@/components/ui/StarRating';
import { useRestaurantStore, type Restaurant, type HappyHour, type MenuItem, type Deal } from '@/store/restaurantStore';
import { useAuthStore } from '@/store/authStore';
import { getActiveHappyHour, getRestaurantEmoji } from '@/lib/happyHourHelpers';
import { checkIn } from '@/lib/checkin';

const HERO_H = 280;
const CROWD = CROWD_CONFIG;

// ─── Data adapters ────────────────────────────────────────────────────────────

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTimeDisplay(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const hour12 = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatMinLeft(min: number) {
  if (min <= 0) return 'Ended';
  if (min < 60) return `${min}m left`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m left` : `${h}h left`;
}

function buildScheduleRows(happyHours: HappyHour[]) {
  // Group by start_time+end_time, collect day names
  const groups: Record<string, string[]> = {};
  for (const hh of happyHours) {
    if (!hh.is_active) continue;
    const key = `${hh.start_time}|${hh.end_time}`;
    groups[key] = [...(groups[key] ?? []), DOW[hh.day_of_week]];
  }
  return Object.entries(groups).map(([key, days]) => {
    const [start, end] = key.split('|');
    return { days: days.join(', '), timeRange: `${formatTimeDisplay(start)} – ${formatTimeDisplay(end)}` };
  });
}

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDealBadge(deal: Deal): string {
  if (deal.discount_type === 'percentage' && deal.discount_value != null)
    return `${deal.discount_value}% OFF`;
  if (deal.discount_type === 'fixed' && deal.discount_value != null)
    return `$${deal.discount_value % 1 === 0 ? deal.discount_value : deal.discount_value.toFixed(2)} OFF`;
  if (deal.discount_type === 'bogo') return 'BOGO';
  if (deal.discount_type === 'free_item') return 'FREE';
  return 'DEAL';
}

function formatDealDays(days: number[] | null): string {
  if (!days || days.length === 0 || days.length === 7) return 'Every day';
  return days.map((d) => DOW_SHORT[d]).join(', ');
}

function getActiveDeals(deals: Deal[]): Deal[] {
  const now = new Date();
  const today = now.getDay();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return deals.filter((d) => {
    if (!d.is_active) return false;
    if (d.valid_days && d.valid_days.length > 0 && !d.valid_days.includes(today)) return false;
    if (d.start_time && d.end_time) {
      const [sh, sm] = d.start_time.split(':').map(Number);
      const [eh, em] = d.end_time.split(':').map(Number);
      if (nowMins < sh * 60 + sm || nowMins > eh * 60 + em) return false;
    }
    return true;
  });
}

function buildDealCategories(items: MenuItem[]) {
  const catMap: Record<string, MenuItem[]> = {};
  for (const item of items) {
    if (!item.is_available || item.happy_hour_price == null) continue;
    const cat = item.category ?? 'Other';
    catMap[cat] = [...(catMap[cat] ?? []), item];
  }
  return Object.entries(catMap).map(([category, catItems]) => ({
    category,
    items: catItems.map((i) => ({
      name: i.name,
      originalPrice: i.regular_price != null ? `$${i.regular_price}` : '',
      dealPrice: `$${i.happy_hour_price}`,
    })),
  }));
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedRestaurant, loading, fetchRestaurantById, favorites, toggleFavorite } = useRestaurantStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInMsg, setCheckInMsg] = useState('');
  const [userHelpfulVotes, setUserHelpfulVotes] = useState<Set<string>>(new Set());
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});

  const detail: Restaurant | null = selectedRestaurant?.id === id ? selectedRestaurant : null;
  const favorited = favorites.includes(id ?? '');

  useEffect(() => {
    if (id) fetchRestaurantById(id);
  }, [id]);

  useEffect(() => {
    if (detail) Analytics.restaurantView(detail.id, detail.name);
  }, [detail?.id]);

  // Seed local helpful counts from loaded reviews
  useEffect(() => {
    if (!detail) return;
    const counts: Record<string, number> = {};
    (detail.reviews ?? []).forEach((r) => { counts[r.id] = r.helpful_count; });
    setHelpfulCounts(counts);
  }, [detail?.id]);

  // Fetch which reviews the signed-in user has already voted helpful
  useEffect(() => {
    if (!user || !detail) return;
    const ids = (detail.reviews ?? []).map((r) => r.id);
    if (!ids.length) return;
    supabase
      .from('review_helpful_votes')
      .select('review_id')
      .eq('user_id', user.id)
      .in('review_id', ids)
      .then(({ data }) => {
        setUserHelpfulVotes(new Set((data ?? []).map((v) => v.review_id)));
      });
  }, [user?.id, detail?.id]);

  const headerOpacity = scrollY.interpolate({ inputRange: [HERO_H - 80, HERO_H - 20], outputRange: [0, 1], extrapolate: 'clamp' });
  const heroScale    = scrollY.interpolate({ inputRange: [-60, 0], outputRange: [1.12, 1], extrapolate: 'clamp' });

  const handleFavorite = () => {
    if (!id) return;
    toggleFavorite(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const toggleHelpful = async (reviewId: string) => {
    if (!user) { router.push('/(auth)/login' as any); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const voted = userHelpfulVotes.has(reviewId);
    if (voted) {
      setUserHelpfulVotes((prev) => { const s = new Set(prev); s.delete(reviewId); return s; });
      setHelpfulCounts((prev) => ({ ...prev, [reviewId]: Math.max(0, (prev[reviewId] ?? 1) - 1) }));
      await supabase.from('review_helpful_votes').delete().match({ user_id: user.id, review_id: reviewId });
      supabase.rpc('decrement_helpful_count', { p_review_id: reviewId });
    } else {
      setUserHelpfulVotes((prev) => new Set([...prev, reviewId]));
      setHelpfulCounts((prev) => ({ ...prev, [reviewId]: (prev[reviewId] ?? 0) + 1 }));
      await supabase.from('review_helpful_votes').insert({ user_id: user.id, review_id: reviewId });
      supabase.rpc('increment_helpful_count', { p_review_id: reviewId });
    }
  };

  const handleShare = async () => {
    if (!detail) return;
    await Share.share({ message: `Check out ${detail.name} happy hour on Cheap Dates!` });
  };

  const handleReserve = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/reservation/[restaurantId]', params: { restaurantId: id } });
  };

  const handleCheckIn = async () => {
    if (!user) { router.push('/(auth)/login' as any); return; }
    if (!id || !detail) return;
    setCheckingIn(true);
    const result = await checkIn(user.id, id, detail.neighborhood ?? null);
    setCheckingIn(false);
    if (result.isDuplicate) {
      setCheckInMsg('Already checked in today!');
    } else if (result.success) {
      setCheckedIn(true);
      const parts: string[] = [`+${result.pointsEarned} pts`];
      if (result.isNewNeighborhood) parts.push('new neighborhood!');
      if (result.leveledUpTo) parts.push(`⬆️ ${result.leveledUpTo}!`);
      if (result.badgesEarned.length) parts.push(`🏅 ${result.badgesEarned.join(', ')}`);
      setCheckInMsg(parts.join(' · '));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // ── Loading ──
  if (loading || !detail) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <SafeAreaView edges={['top']}>
          <TouchableOpacity style={[styles.floatingBtn, { margin: SPACING.lg }]} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={COLORS.orange} size="large" />
        </View>
      </View>
    );
  }

  const crowd = CROWD[detail.crowd_level] ?? CROWD[0];
  const emoji = getRestaurantEmoji(detail);
  const activeHH = getActiveHappyHour(detail);
  const minLeft = activeHH?.minLeft ?? 0;
  const countdownColor = minLeft <= 30 ? COLORS.status.error : minLeft <= 60 ? COLORS.amber : COLORS.orange;
  const scheduleRows = buildScheduleRows(detail.happy_hours ?? []);
  const dealCategories = buildDealCategories(detail.menu_items ?? []);
  const activeDeals = getActiveDeals(detail.deals ?? []);
  const allDeals = (detail.deals ?? []).filter((d) => d.is_active);
  const reviews = detail.reviews ?? [];
  const firstScheduleEnd = scheduleRows[0]?.timeRange.split('–')[1]?.trim() ?? '';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── Sticky floating header ── */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity, paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.cream} />
        </TouchableOpacity>
        <Text style={styles.stickyTitle} numberOfLines={1}>{detail.name}</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={COLORS.cream} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Floating back + share (visible on hero) ── */}
      <SafeAreaView style={styles.floatingBtns} edges={['top']} pointerEvents="box-none">
        <Animated.View style={{ opacity: headerOpacity.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
          <View style={styles.floatingBtnRow}>
            <TouchableOpacity style={styles.floatingBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
            </TouchableOpacity>
            <View style={styles.floatingBtnRight}>
              <TouchableOpacity style={styles.floatingBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={20} color={COLORS.cream} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.floatingBtn} onPress={handleFavorite}>
                <Ionicons
                  name={favorited ? 'heart' : 'heart-outline'}
                  size={20}
                  color={favorited ? '#FF375F' : COLORS.cream}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* ── Hero ── */}
        <Animated.View style={[styles.hero, { transform: [{ scale: heroScale }] }]}>
          <LinearGradient
            colors={[crowd.glow, 'rgba(255,107,26,0.25)', 'rgba(26,10,0,0.85)', '#1A0A00']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <View style={styles.emojiRing}>
              <Text style={styles.heroEmoji}>{emoji}</Text>
            </View>
            <Text style={styles.heroName}>{detail.name}</Text>
            <View style={styles.heroMeta}>
              {detail.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={11} color="#fff" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
              <View style={[styles.crowdBadge, { backgroundColor: crowd.color + '22', borderColor: crowd.color + '50' }]}>
                <View style={[styles.crowdDot, { backgroundColor: crowd.color }]} />
                <Text style={[styles.crowdBadgeText, { color: crowd.color }]}>{crowd.label}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Quick stats strip ── */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={14} color={COLORS.gold} />
            <Text style={styles.statVal}>{detail.average_rating.toFixed(1)}</Text>
            <Text style={styles.statSub}>({detail.review_count})</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={14} color={COLORS.muted} />
            <Text style={styles.statVal}>{detail.neighborhood ?? 'Dallas'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="restaurant-outline" size={14} color={COLORS.muted} />
            <Text style={styles.statVal}>{detail.cuisine_type ?? 'Bar & Grill'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color={countdownColor} />
            <Text style={[styles.statVal, { color: countdownColor }]}>
              {activeHH ? formatMinLeft(minLeft) : 'See hours'}
            </Text>
          </View>
        </View>

        {/* ── Tags ── */}
        {(detail.vibe_tags ?? []).length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsRow}>
            {(detail.vibe_tags ?? []).map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* ── Happy Hour Schedule ── */}
        {scheduleRows.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconBg}>
                <Ionicons name="time-outline" size={16} color={COLORS.orange} />
              </View>
              <Text style={styles.sectionTitle}>Happy Hour Schedule</Text>
            </View>
            {scheduleRows.map((row, i) => (
              <View key={i} style={styles.scheduleRow}>
                <Text style={styles.scheduleDays}>{row.days}</Text>
                <View style={styles.scheduleTimePill}>
                  <Text style={styles.scheduleTime}>{row.timeRange}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Deals by category ── */}
        {dealCategories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconBg}>
                <Ionicons name="pricetag-outline" size={16} color={COLORS.orange} />
              </View>
              <Text style={styles.sectionTitle}>Happy Hour Deals</Text>
            </View>
            {dealCategories.map((cat) => (
              <View key={cat.category} style={styles.dealCategory}>
                <Text style={styles.dealCategoryLabel}>{cat.category}</Text>
                {cat.items.map((item, i) => (
                  <View key={i} style={styles.dealItemRow}>
                    <Text style={styles.dealItemName}>{item.name}</Text>
                    <View style={styles.dealPriceGroup}>
                      {item.originalPrice ? (
                        <Text style={styles.dealOrigPrice}>{item.originalPrice}</Text>
                      ) : null}
                      <View style={styles.dealPricePill}>
                        <Text style={styles.dealPrice}>{item.dealPrice}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* ── Special Deals ── */}
        {allDeals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconBg}>
                <Ionicons name="gift-outline" size={16} color={COLORS.orange} />
              </View>
              <Text style={styles.sectionTitle}>Special Deals</Text>
            </View>
            {allDeals.map((deal, i) => {
              const isLive = activeDeals.some((d) => d.id === deal.id);
              return (
                <View
                  key={deal.id}
                  style={[
                    styles.specialDealRow,
                    i > 0 && styles.specialDealBorder,
                  ]}
                >
                  <View style={[styles.dealBadge, isLive && styles.dealBadgeLive]}>
                    <Text style={[styles.dealBadgeText, isLive && styles.dealBadgeTextLive]}>
                      {formatDealBadge(deal)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.specialDealTitle}>{deal.title}</Text>
                    {deal.description ? (
                      <Text style={styles.specialDealDesc} numberOfLines={2}>{deal.description}</Text>
                    ) : null}
                    <View style={styles.specialDealMeta}>
                      <Text style={styles.specialDealMetaText}>{formatDealDays(deal.valid_days)}</Text>
                      {deal.start_time && deal.end_time ? (
                        <>
                          <Text style={styles.specialDealMetaDot}>·</Text>
                          <Text style={styles.specialDealMetaText}>
                            {formatTimeDisplay(deal.start_time)} – {formatTimeDisplay(deal.end_time)}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                  {isLive && (
                    <View style={styles.livePill}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>Live</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ── Info ── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBg}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.orange} />
            </View>
            <Text style={styles.sectionTitle}>Info</Text>
          </View>
          <TouchableOpacity style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.muted} />
            <Text style={styles.infoText}>{detail.address}</Text>
            <Ionicons name="open-outline" size={13} color={COLORS.muted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          {detail.phone ? (
            <>
              <View style={styles.infoSep} />
              <TouchableOpacity style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color={COLORS.muted} />
                <Text style={styles.infoText}>{detail.phone}</Text>
              </TouchableOpacity>
            </>
          ) : null}
          {detail.website ? (
            <>
              <View style={styles.infoSep} />
              <TouchableOpacity style={styles.infoRow}>
                <Ionicons name="globe-outline" size={16} color={COLORS.muted} />
                <Text style={[styles.infoText, { color: COLORS.orange }]}>{detail.website}</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {/* ── Reviews ── */}
        <View style={styles.section}>
          <View style={[styles.sectionTitleRow, { marginBottom: SPACING.md }]}>
            <View style={styles.sectionIconBg}>
              <Ionicons name="chatbubble-outline" size={16} color={COLORS.orange} />
            </View>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <TouchableOpacity
              style={styles.writeReviewBtn}
              onPress={() => router.push({ pathname: '/review/[restaurantId]', params: { restaurantId: id } })}
            >
              <Text style={styles.writeReviewText}>Write a review</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ratingSummary}>
            <Text style={styles.ratingBig}>{detail.average_rating.toFixed(1)}</Text>
            <View>
              <StarRating rating={detail.average_rating} reviewCount={detail.review_count} showStars size={14} />
              <CrowdMeter level={detail.crowd_level} showLabel />
            </View>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.noReviews}>
              <Text style={styles.noReviewsText}>No reviews yet — be the first!</Text>
            </View>
          ) : (
            reviews.slice(0, 5).map((rev) => {
              const voted = userHelpfulVotes.has(rev.id);
              const count = helpfulCounts[rev.id] ?? 0;
              return (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarEmoji}>
                        {rev.profiles?.avatar_url ? '👤' : '🧑'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewAuthor}>
                        {rev.profiles?.full_name ?? 'Anonymous'}
                      </Text>
                      <StarRating rating={rev.rating} showStars size={13} />
                    </View>
                    <Text style={styles.reviewTime}>
                      {new Date(rev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>

                  {rev.title ? (
                    <Text style={styles.reviewTitle}>{rev.title}</Text>
                  ) : null}
                  {rev.body ? (
                    <Text style={styles.reviewText}>{rev.body}</Text>
                  ) : null}

                  {(rev.photo_urls ?? []).length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewPhotosRow}>
                      {(rev.photo_urls ?? []).map((url, i) => (
                        <Image key={i} source={{ uri: url }} style={styles.reviewPhoto} />
                      ))}
                    </ScrollView>
                  )}

                  <TouchableOpacity
                    style={[styles.helpfulBtn, voted && styles.helpfulBtnActive]}
                    onPress={() => toggleHelpful(rev.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={voted ? 'thumbs-up' : 'thumbs-up-outline'}
                      size={13}
                      color={voted ? COLORS.orange : COLORS.muted}
                    />
                    <Text style={[styles.helpfulText, voted && { color: COLORS.orange }]}>
                      Helpful{count > 0 ? ` (${count})` : ''}
                    </Text>
                  </TouchableOpacity>

                  {rev.restaurant_reply ? (
                    <View style={styles.ownerReply}>
                      <View style={styles.ownerReplyHeader}>
                        <Ionicons name="business-outline" size={13} color={COLORS.orange} />
                        <Text style={styles.ownerReplyLabel}>Owner response</Text>
                      </View>
                      <Text style={styles.ownerReplyText}>{rev.restaurant_reply}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </Animated.ScrollView>

      {/* ── Sticky bottom bar ── */}
      <View style={[styles.reserveBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        {/* Check-in button */}
        <TouchableOpacity
          style={[
            styles.checkInBtn,
            checkedIn && styles.checkInBtnDone,
            checkingIn && { opacity: 0.7 },
          ]}
          onPress={handleCheckIn}
          disabled={checkingIn}
          activeOpacity={0.82}
        >
          {checkingIn ? (
            <ActivityIndicator size="small" color={checkedIn ? COLORS.status.success : COLORS.cream} />
          ) : checkedIn ? (
            <>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.status.success} />
              <Text style={[styles.checkInBtnText, { color: COLORS.status.success }]}>
                {checkInMsg}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="location" size={17} color={COLORS.cream} />
              <Text style={styles.checkInBtnText}>Check In</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.reserveBarDivider} />

        <View style={styles.reserveBarLeft}>
          <Text style={styles.reserveBarLabel}>Reserve</Text>
          <Text style={styles.reserveBarSub}>
            {firstScheduleEnd ? `Ends ${firstScheduleEnd}` : 'See schedule'}
          </Text>
        </View>
        <TouchableOpacity style={styles.reserveBtn} onPress={handleReserve} activeOpacity={0.85}>
          <Text style={styles.reserveBtnText}>Book</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.dark },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  stickyHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: 'rgba(26,10,0,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  headerBtn: {
    width: 38, height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  stickyTitle: { fontFamily: FONTS.playfair, fontSize: 18, color: COLORS.cream, flex: 1, textAlign: 'center', marginHorizontal: SPACING.sm },

  floatingBtns: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 99 },
  floatingBtnRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  floatingBtnRight: { flexDirection: 'row', gap: SPACING.sm },
  floatingBtn: {
    width: 40, height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(26,10,0,0.65)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,248,240,0.15)',
  },

  hero: { height: HERO_H, justifyContent: 'flex-end', backgroundColor: COLORS.surface },
  heroContent: { alignItems: 'center', paddingBottom: SPACING.xl },
  emojiRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(26,10,0,0.60)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,248,240,0.15)',
    marginBottom: SPACING.md,
  },
  heroEmoji: { fontSize: 40 },
  heroName: { fontFamily: FONTS.playfair, fontSize: 28, color: COLORS.cream, letterSpacing: -0.5, marginBottom: SPACING.sm },
  heroMeta: { flexDirection: 'row', gap: SPACING.sm },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.orange, paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  verifiedText: { fontFamily: FONTS.dmMedium, fontSize: 10, color: '#fff' },
  crowdBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  crowdDot: { width: 6, height: 6, borderRadius: 3 },
  crowdBadgeText: { fontFamily: FONTS.dmMedium, fontSize: 10 },

  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: COLORS.border.subtle,
    paddingVertical: SPACING.md,
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  statVal: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.cream },
  statSub: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },
  statDivider: { width: 1, height: 18, backgroundColor: COLORS.border.subtle },

  tagsRow: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  tagChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.overlay.orange10,
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  tagText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.amber },

  section: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    overflow: 'hidden',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  sectionIconBg: {
    width: 32, height: 32, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.overlay.orange15,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontFamily: FONTS.playfair, fontSize: 18, color: COLORS.cream, flex: 1 },

  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  scheduleDays: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.cream },
  scheduleTimePill: {
    backgroundColor: COLORS.overlay.orange15,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border.default,
  },
  scheduleTime: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.orange },

  dealCategory: { borderBottomWidth: 1, borderBottomColor: COLORS.border.subtle },
  dealCategoryLabel: {
    fontFamily: FONTS.dmMedium,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  dealItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.subtle,
  },
  dealItemName: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.cream, flex: 1 },
  dealPriceGroup: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dealOrigPrice: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, textDecorationLine: 'line-through' },
  dealPricePill: {
    backgroundColor: 'rgba(255,179,71,0.15)',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(255,179,71,0.30)',
  },
  dealPrice: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.amber },

  specialDealRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  specialDealBorder: { borderTopWidth: 1, borderTopColor: COLORS.border.subtle },
  dealBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1, borderColor: COLORS.border.default,
    minWidth: 56, alignItems: 'center',
  },
  dealBadgeLive: { backgroundColor: COLORS.overlay.orange15, borderColor: COLORS.orange + '60' },
  dealBadgeText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.muted },
  dealBadgeTextLive: { color: COLORS.orange },
  specialDealTitle: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.cream },
  specialDealDesc: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, lineHeight: 17 },
  specialDealMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  specialDealMetaText: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },
  specialDealMetaDot: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: 'rgba(52,199,89,0.12)',
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(52,199,89,0.30)',
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.status.success },
  liveText: { fontFamily: FONTS.dmMedium, fontSize: 10, color: COLORS.status.success },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  infoText: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.cream, flex: 1 },
  infoSep: { height: 1, backgroundColor: COLORS.border.subtle, marginLeft: 48 },

  writeReviewBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.overlay.orange15,
    borderWidth: 1, borderColor: COLORS.border.default,
  },
  writeReviewText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.orange },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  ratingBig: { fontFamily: FONTS.playfair, fontSize: 40, color: COLORS.cream },
  noReviews: { padding: SPACING.xl, alignItems: 'center' },
  noReviewsText: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted },
  reviewCard: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.subtle,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.overlay.orange15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  reviewAvatarEmoji: { fontSize: 18 },
  reviewAuthor: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.cream, marginBottom: 2 },
  reviewTime: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },
  reviewTitle: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.cream, marginBottom: 4 },
  reviewText: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted, lineHeight: 21 },
  reviewPhotosRow: { marginTop: SPACING.sm },
  reviewPhoto: {
    width: 80, height: 80, borderRadius: RADIUS.md,
    marginRight: SPACING.sm, backgroundColor: COLORS.surface,
  },
  helpfulBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  helpfulBtnActive: {
    backgroundColor: COLORS.overlay.orange10,
    borderColor: COLORS.border.default,
  },
  helpfulText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.muted },
  ownerReply: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.overlay.orange10,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border.default,
    padding: SPACING.md, gap: SPACING.xs,
  },
  ownerReplyHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ownerReplyLabel: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.orange },
  ownerReplyText: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.cream, lineHeight: 19 },

  reserveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: 'rgba(26,10,0,0.97)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border.subtle,
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border.default,
  },
  checkInBtnDone: {
    backgroundColor: 'rgba(52,199,89,0.12)',
    borderColor: 'rgba(52,199,89,0.30)',
  },
  checkInBtnText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.cream },
  reserveBarDivider: { width: 1, height: 28, backgroundColor: COLORS.border.subtle },
  reserveBarLeft: { flex: 1 },
  reserveBarLabel: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.cream },
  reserveBarSub: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted, marginTop: 1 },
  reserveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    height: 44,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  reserveBtnText: { fontFamily: FONTS.dmMedium, fontSize: 14, color: '#fff' },
});
