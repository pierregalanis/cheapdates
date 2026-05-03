import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Analytics } from '@/lib/analytics';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = 280;

// ─── Mock restaurant data ──────────────────────────────────────────────────────

const MOCK_DETAIL: Record<string, RestaurantDetail> = {
  '1': {
    id: '1', name: 'Bottled Blonde', neighborhood: 'Uptown', emoji: '🍸',
    rating: 4.6, reviewCount: 284, checkinsToday: 43, distance: '0.3 mi',
    crowdLevel: 3, isVerified: true, address: '2724 Elm St, Dallas TX 75204',
    phone: '(214) 555-0181', website: 'bottledblonde.com',
    tags: ['Rooftop', 'Date Night', 'Cocktails', 'Upscale'],
    happyHours: [
      { days: 'Mon–Fri', start: '3:00 PM', end: '7:00 PM' },
      { days: 'Sat–Sun', start: '12:00 PM', end: '5:00 PM' },
    ],
    deals: [
      { category: 'Drinks', items: [
        { name: '$5 Signature Cocktails', originalPrice: '$14', dealPrice: '$5' },
        { name: '$4 Draft Beer', originalPrice: '$8', dealPrice: '$4' },
        { name: '$6 House Wine', originalPrice: '$12', dealPrice: '$6' },
      ]},
      { category: 'Food', items: [
        { name: 'Truffle Fries', originalPrice: '$14', dealPrice: '$8' },
        { name: 'Sliders (3)', originalPrice: '$16', dealPrice: '$10' },
      ]},
    ],
    reviews: [
      { id: 'r1', author: 'Jessica M.', avatar: '👩', rating: 5, text: 'Best rooftop in Uptown! The $5 cocktail deal is unreal, and the view at sunset is chef\'s kiss.', time: '2 days ago' },
      { id: 'r2', author: 'Carlos R.', avatar: '🧑', rating: 4, text: 'Great happy hour spot. Gets crowded fast after 5pm so arrive early. Service is always friendly.', time: '1 week ago' },
      { id: 'r3', author: 'Aisha K.', avatar: '👩🏽', rating: 5, text: 'My go-to for date night. The truffle fries are addictive and $8 during HH is a steal.', time: '2 weeks ago' },
    ],
    isFavorited: false,
    minLeft: 47,
  },
  default: {
    id: 'default', name: 'The Rustic', neighborhood: 'Design District', emoji: '🌿',
    rating: 4.5, reviewCount: 391, checkinsToday: 58, distance: '0.8 mi',
    crowdLevel: 2, isVerified: true, address: '3656 Howell St, Dallas TX 75204',
    phone: '(214) 555-0199', website: 'therustic.com',
    tags: ['Patio', 'Dog Friendly', 'Live Music', 'American'],
    happyHours: [
      { days: 'Mon–Fri', start: '4:00 PM', end: '7:00 PM' },
    ],
    deals: [
      { category: 'Drinks', items: [
        { name: '$5 Margaritas', originalPrice: '$13', dealPrice: '$5' },
        { name: '$4 Lone Star Draft', originalPrice: '$7', dealPrice: '$4' },
        { name: '$6 Wine by the Glass', originalPrice: '$11', dealPrice: '$6' },
      ]},
      { category: 'Food', items: [
        { name: 'Queso & Chips', originalPrice: '$12', dealPrice: '$8' },
        { name: 'Pretzel Bites', originalPrice: '$10', dealPrice: '$7' },
      ]},
    ],
    reviews: [
      { id: 'r1', author: 'Marcus T.', avatar: '🧔', rating: 5, text: 'Huge outdoor space and live music on weekends. The patio is dog-friendly too which is rare in Dallas!', time: '3 days ago' },
      { id: 'r2', author: 'Linda S.', avatar: '👩🏻', rating: 4, text: 'Great vibes. $5 margaritas are a bargain for the quality. Staff is super chill.', time: '1 week ago' },
    ],
    isFavorited: true,
    minLeft: 47,
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface DealItem { name: string; originalPrice: string; dealPrice: string }
interface DealCategory { category: string; items: DealItem[] }
interface HappyHourSchedule { days: string; start: string; end: string }
interface Review { id: string; author: string; avatar: string; rating: number; text: string; time: string }
interface RestaurantDetail {
  id: string; name: string; neighborhood: string; emoji: string;
  rating: number; reviewCount: number; checkinsToday: number; distance: string;
  crowdLevel: number; isVerified: boolean; address: string; phone: string; website: string;
  tags: string[]; happyHours: HappyHourSchedule[]; deals: DealCategory[];
  reviews: Review[]; isFavorited: boolean; minLeft: number;
}

const CROWD = {
  0: { label: 'Unknown',      color: COLORS.muted,          glow: 'rgba(138,106,80,0.05)' },
  1: { label: 'Quiet',        color: '#34C759',              glow: 'rgba(52,199,89,0.28)'  },
  2: { label: 'Getting Busy', color: '#FFB347',              glow: 'rgba(255,179,71,0.28)' },
  3: { label: 'Busy',         color: '#FF6B1A',              glow: 'rgba(255,107,26,0.38)' },
  4: { label: 'Packed 🔥',   color: '#FF3B30',              glow: 'rgba(255,59,48,0.38)'  },
} as const;

function formatMinLeft(min: number) {
  if (min <= 0) return 'Ended';
  if (min < 60) return `${min}m left`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m left` : `${h}h left`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRow({ rating, reviewCount }: { rating: number; reviewCount?: number }) {
  return (
    <View style={styles.starRow}>
      {[1,2,3,4,5].map((i) => (
        <Ionicons key={i} name={i <= Math.round(rating) ? 'star' : 'star-outline'} size={14} color={COLORS.gold} />
      ))}
      <Text style={styles.ratingNum}>{rating.toFixed(1)}</Text>
      {reviewCount != null && <Text style={styles.reviewCountText}>({reviewCount} reviews)</Text>}
    </View>
  );
}

function CrowdBar({ level }: { level: number }) {
  const cfg = CROWD[level as keyof typeof CROWD] ?? CROWD[0];
  return (
    <View style={styles.crowdBarRow}>
      {[1,2,3,4].map((b) => (
        <View key={b} style={[styles.crowdBarSegment, b <= level && { backgroundColor: cfg.color }]} />
      ))}
      <Text style={[styles.crowdLabel, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const detail = MOCK_DETAIL[id] ?? MOCK_DETAIL['default'];
  const [favorited, setFavorited] = useState(detail.isFavorited);
  const crowd = CROWD[detail.crowdLevel as keyof typeof CROWD] ?? CROWD[0];

  useEffect(() => {
    Analytics.restaurantView(detail.id, detail.name);
  }, [detail.id, detail.name]);

  const headerOpacity = scrollY.interpolate({ inputRange: [HERO_H - 80, HERO_H - 20], outputRange: [0, 1], extrapolate: 'clamp' });
  const heroScale    = scrollY.interpolate({ inputRange: [-60, 0], outputRange: [1.12, 1], extrapolate: 'clamp' });

  const handleFavorite = () => {
    setFavorited((v) => !v);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleShare = async () => {
    await Share.share({ message: `Check out ${detail.name} happy hour on HappyHour Dallas!` });
  };

  const handleReserve = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/reservation/[restaurantId]', params: { restaurantId: detail.id } });
  };

  const countdownColor = detail.minLeft <= 30 ? COLORS.status.error : detail.minLeft <= 60 ? COLORS.amber : COLORS.orange;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── Sticky floating header (appears on scroll) ── */}
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
                <Ionicons name={favorited ? 'heart' : 'heart-outline'} size={20} color={favorited ? '#FF375F' : COLORS.cream} />
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
              <Text style={styles.heroEmoji}>{detail.emoji}</Text>
            </View>
            <Text style={styles.heroName}>{detail.name}</Text>
            <View style={styles.heroMeta}>
              {detail.isVerified && (
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
            <Text style={styles.statVal}>{detail.rating.toFixed(1)}</Text>
            <Text style={styles.statSub}>({detail.reviewCount})</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={14} color={COLORS.muted} />
            <Text style={styles.statVal}>{detail.distance}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={14} color={COLORS.muted} />
            <Text style={styles.statVal}>{detail.checkinsToday}</Text>
            <Text style={styles.statSub}>today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color={countdownColor} />
            <Text style={[styles.statVal, { color: countdownColor }]}>{formatMinLeft(detail.minLeft)}</Text>
          </View>
        </View>

        {/* ── Tags ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsRow}>
          {detail.tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── Happy Hour Schedule ── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBg}>
              <Ionicons name="time-outline" size={16} color={COLORS.orange} />
            </View>
            <Text style={styles.sectionTitle}>Happy Hour Schedule</Text>
          </View>
          {detail.happyHours.map((hh, i) => (
            <View key={i} style={styles.scheduleRow}>
              <Text style={styles.scheduleDays}>{hh.days}</Text>
              <View style={styles.scheduleTimePill}>
                <Text style={styles.scheduleTime}>{hh.start} – {hh.end}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Deals by category ── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBg}>
              <Ionicons name="pricetag-outline" size={16} color={COLORS.orange} />
            </View>
            <Text style={styles.sectionTitle}>Happy Hour Deals</Text>
          </View>
          {detail.deals.map((cat) => (
            <View key={cat.category} style={styles.dealCategory}>
              <Text style={styles.dealCategoryLabel}>{cat.category}</Text>
              {cat.items.map((item, i) => (
                <View key={i} style={styles.dealItemRow}>
                  <Text style={styles.dealItemName}>{item.name}</Text>
                  <View style={styles.dealPriceGroup}>
                    <Text style={styles.dealOrigPrice}>{item.originalPrice}</Text>
                    <View style={styles.dealPricePill}>
                      <Text style={styles.dealPrice}>{item.dealPrice}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

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
          <View style={styles.infoSep} />
          <TouchableOpacity style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color={COLORS.muted} />
            <Text style={styles.infoText}>{detail.phone}</Text>
          </TouchableOpacity>
          <View style={styles.infoSep} />
          <TouchableOpacity style={styles.infoRow}>
            <Ionicons name="globe-outline" size={16} color={COLORS.muted} />
            <Text style={[styles.infoText, { color: COLORS.orange }]}>{detail.website}</Text>
          </TouchableOpacity>
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
              onPress={() => router.push({ pathname: '/review/[restaurantId]', params: { restaurantId: detail.id } })}
            >
              <Text style={styles.writeReviewText}>Write a review</Text>
            </TouchableOpacity>
          </View>

          {/* Rating summary */}
          <View style={styles.ratingSummary}>
            <Text style={styles.ratingBig}>{detail.rating.toFixed(1)}</Text>
            <View>
              <StarRow rating={detail.rating} reviewCount={detail.reviewCount} />
              <CrowdBar level={detail.crowdLevel} />
            </View>
          </View>

          {detail.reviews.map((rev) => (
            <View key={rev.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarEmoji}>{rev.avatar}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewAuthor}>{rev.author}</Text>
                  <StarRow rating={rev.rating} />
                </View>
                <Text style={styles.reviewTime}>{rev.time}</Text>
              </View>
              <Text style={styles.reviewText}>{rev.text}</Text>
            </View>
          ))}
        </View>
      </Animated.ScrollView>

      {/* ── Sticky Reserve CTA ── */}
      <View style={[styles.reserveBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        <View style={styles.reserveBarLeft}>
          <Text style={styles.reserveBarLabel}>Reserve a table</Text>
          <Text style={styles.reserveBarSub}>Happy hour ends at {detail.happyHours[0]?.end}</Text>
        </View>
        <TouchableOpacity style={styles.reserveBtn} onPress={handleReserve} activeOpacity={0.85}>
          <Text style={styles.reserveBtnText}>Reserve</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.dark },

  // Sticky header
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

  // Floating buttons
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

  // Hero
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

  // Stats strip
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

  // Tags
  tagsRow: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  tagChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.overlay.orange10,
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  tagText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.amber },

  // Sections
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

  // Schedule
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

  // Deals
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

  // Info
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  infoText: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.cream, flex: 1 },
  infoSep: { height: 1, backgroundColor: COLORS.border.subtle, marginLeft: 48 },

  // Reviews
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
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  ratingNum: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.gold, marginLeft: 4 },
  reviewCountText: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },
  crowdBarRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  crowdBarSegment: { width: 18, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,248,240,0.10)' },
  crowdLabel: { fontFamily: FONTS.dmMedium, fontSize: 11, marginLeft: 4 },
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
  reviewText: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted, lineHeight: 21 },

  // Reserve bar
  reserveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    backgroundColor: 'rgba(26,10,0,0.97)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border.subtle,
  },
  reserveBarLeft: {},
  reserveBarLabel: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.cream },
  reserveBarSub: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, marginTop: 2 },
  reserveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  reserveBtnText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: '#FFFFFF' },
});
