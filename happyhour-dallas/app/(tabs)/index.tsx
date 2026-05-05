import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';
import CrowdMeter, { CROWD_CONFIG } from '@/components/ui/CrowdMeter';
import StarRating from '@/components/ui/StarRating';
import { useRestaurantStore, type Restaurant } from '@/store/restaurantStore';
import { useCityStore } from '@/store/cityStore';
import {
  getActiveHappyHour,
  getRestaurantEmoji,
  getTopDeals,
  matchesChip,
} from '@/lib/happyHourHelpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nav = (href: any) => router.push(href);

// ─── Filter chips ─────────────────────────────────────────────────────────────

const FILTER_CHIPS = [
  { id: 'now', label: '🔴 Happening Now', isLive: true },
  { id: 'drinks', label: '🍸 Drinks Only' },
  { id: 'food', label: '🍔 Food + Drinks' },
  { id: 'rooftop', label: '🏙️ Rooftop' },
  { id: 'datenight', label: '💑 Date Night' },
  { id: 'dogfriendly', label: '🐶 Dog Friendly' },
  { id: 'livemusic', label: '🎵 Live Music' },
  { id: 'patio', label: '🌿 Patio' },
  { id: 'under5', label: '💰 Under $5' },
];

const CROWD = CROWD_CONFIG;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCountdownColor(minLeft: number): string {
  if (minLeft <= 30) return COLORS.status.error;
  if (minLeft <= 60) return COLORS.amber;
  return COLORS.orange;
}

function formatCountdown(minLeft: number): string {
  if (minLeft <= 0) return 'Ended';
  if (minLeft < 60) return `${minLeft}m left`;
  const h = Math.floor(minLeft / 60);
  const m = minLeft % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h left`;
}

// ─── Cards ────────────────────────────────────────────────────────────────────

const SpotCard = memo(function SpotCard({ restaurant }: { restaurant: Restaurant }) {
  const crowd = CROWD[restaurant.crowd_level];
  const hh = getActiveHappyHour(restaurant);
  const minLeft = hh?.minLeft ?? 0;
  const countdownColor = getCountdownColor(minLeft);
  const emoji = getRestaurantEmoji(restaurant);
  const deals = getTopDeals(restaurant);

  return (
    <TouchableOpacity
      style={styles.spotCardWrapper}
      activeOpacity={0.82}
      onPress={() => nav({ pathname: '/restaurant/[id]', params: { id: restaurant.id } })}
    >
      <View style={styles.spotCard}>
        <LinearGradient
          colors={[crowd.glow, 'rgba(255,107,26,0.14)', 'rgba(26,10,0,0.06)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.spotCardGradient}
        >
          <View style={styles.spotBadgeRow}>
            <View style={[
              styles.crowdBadge,
              { backgroundColor: crowd.color + '22', borderColor: crowd.color + '50' },
            ]}>
              <View style={[styles.crowdDot, { backgroundColor: crowd.color }]} />
              <Text style={[styles.crowdBadgeText, { color: crowd.color }]}>
                {crowd.label}
              </Text>
            </View>
            {restaurant.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={9} color="#fff" />
                <Text style={styles.verifiedText}> Verified</Text>
              </View>
            )}
          </View>
          <View style={styles.emojiRing}>
            <Text style={styles.spotEmoji}>{emoji}</Text>
          </View>
        </LinearGradient>

        <View style={styles.spotCardBody}>
          <Text style={styles.spotName} numberOfLines={1}>{restaurant.name}</Text>

          <View style={styles.spotMetaRow}>
            <Ionicons name="location-outline" size={10} color={COLORS.muted} />
            <Text style={styles.spotMeta}>{restaurant.neighborhood ?? restaurant.city}</Text>
            {restaurant.cuisine_type ? (
              <>
                <Text style={styles.spotDot}>·</Text>
                <Text style={styles.spotMeta}>{restaurant.cuisine_type}</Text>
              </>
            ) : null}
          </View>

          <View style={styles.dealPillRow}>
            {deals.length > 0
              ? deals.slice(0, 2).map((deal, i) => (
                  <View key={i} style={styles.dealPill}>
                    <Text style={styles.dealText} numberOfLines={1}>{deal}</Text>
                  </View>
                ))
              : (
                <View style={styles.dealPill}>
                  <Text style={styles.dealText}>Happy hour deals inside</Text>
                </View>
              )
            }
          </View>

          <View style={styles.spotFooter}>
            <View style={styles.countdownRow}>
              <Ionicons name="time-outline" size={10} color={countdownColor} />
              <Text style={[styles.countdownText, { color: countdownColor }]}>
                {hh ? formatCountdown(minLeft) : 'See hours'}
              </Text>
            </View>
            <View style={styles.spotFooterRight}>
              <StarRating rating={restaurant.average_rating} />
              <CrowdMeter level={restaurant.crowd_level} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const ListCard = memo(function ListCard({ restaurant }: { restaurant: Restaurant }) {
  const crowd = CROWD[restaurant.crowd_level];
  const hh = getActiveHappyHour(restaurant);
  const minLeft = hh?.minLeft ?? 0;
  const countdownColor = getCountdownColor(minLeft);
  const emoji = getRestaurantEmoji(restaurant);
  const tags = restaurant.vibe_tags ?? [];

  return (
    <TouchableOpacity
      style={styles.listCardWrapper}
      activeOpacity={0.82}
      onPress={() => nav({ pathname: '/restaurant/[id]', params: { id: restaurant.id } })}
    >
      <View style={[styles.listAccentBar, { backgroundColor: crowd.color }]} />

      <View style={styles.listCard}>
        <View style={[styles.listEmojiBg, { backgroundColor: crowd.color + '18' }]}>
          <Text style={styles.listEmoji}>{emoji}</Text>
        </View>

        <View style={styles.listCardContent}>
          <View style={styles.listRow}>
            <Text style={styles.listName} numberOfLines={1}>{restaurant.name}</Text>
            <View style={styles.listTimeRow}>
              <Ionicons name="time-outline" size={11} color={countdownColor} />
              <Text style={[styles.listTime, { color: countdownColor }]}>
                {hh ? hh.endTime : '—'}
              </Text>
            </View>
          </View>

          <View style={styles.listRow}>
            <View style={styles.listMetaRow}>
              <Ionicons name="location-outline" size={10} color={COLORS.muted} />
              <Text style={styles.listMeta}>{restaurant.neighborhood ?? restaurant.city}</Text>
              {restaurant.cuisine_type ? (
                <>
                  <Text style={styles.listDot}>·</Text>
                  <Text style={styles.listMeta}>{restaurant.cuisine_type}</Text>
                </>
              ) : null}
            </View>
            <Text style={[styles.checkinsText, { color: crowd.color }]}>
              {crowd.label}
            </Text>
          </View>

          <View style={styles.listRow}>
            <View style={styles.listTags}>
              {tags.slice(0, 2).map((tag) => (
                <View key={tag} style={styles.listTag}>
                  <Text style={styles.listTagText}>{tag}</Text>
                </View>
              ))}
            </View>
            <StarRating rating={restaurant.average_rating} reviewCount={restaurant.review_count} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const { restaurants, loading, error, fetchRestaurants } = useRestaurantStore();
  const { selectedCity } = useCityStore();
  const tabBarHeight = useBottomTabBarHeight();
  const [activeFilter, setActiveFilter] = useState('now');
  const [refreshing, setRefreshing] = useState(false);
  const pulseOpacity = useRef(new Animated.Value(1)).current;
  const pulseScale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchRestaurants({ city: selectedCity.name });
  }, [selectedCity.id]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseOpacity, { toValue: 0.15, duration: 650, useNativeDriver: true }),
          Animated.timing(pulseScale,   { toValue: 1.4,  duration: 650, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseOpacity, { toValue: 1,    duration: 650, useNativeDriver: true }),
          Animated.timing(pulseScale,   { toValue: 1,    duration: 650, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseOpacity, pulseScale]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRestaurants({ force: true, city: selectedCity.name });
    setRefreshing(false);
  }, [fetchRestaurants, selectedCity.name]);

  const handleFilter = (id: string) => {
    setActiveFilter(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const filtered = restaurants.filter((r) => matchesChip(r, activeFilter));
  const happeningNow = restaurants.filter((r) => getActiveHappyHour(r) !== null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.orange} />
        </View>
      )}

      {/* Floating AI chat button */}
      <TouchableOpacity
        style={[styles.chatFab, { bottom: tabBarHeight + 16 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); nav('/chat'); }}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[COLORS.orange, '#FF8C42']}
          style={styles.chatFabInner}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {!loading && error && restaurants.length === 0 && (
        <View style={styles.errorState}>
          <Ionicons name="wifi-outline" size={48} color={COLORS.muted} />
          <Text style={styles.errorTitle}>Couldn't load spots</Text>
          <Text style={styles.errorSub}>Check your connection and try again</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRestaurants({ force: true, city: selectedCity.name })}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 80 }]}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.orange}
            colors={[COLORS.orange]}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        renderItem={({ item }) => <ListCard restaurant={item} />}
        ListHeaderComponent={
          <>
            {/* ── Header ── */}
            <LinearGradient
              colors={['rgba(255,107,26,0.11)', 'rgba(255,107,26,0.03)', 'transparent']}
              style={styles.headerGradient}
            >
              <View style={styles.header}>
                <View>
                  <Text style={styles.logoLine1}>Cheap</Text>
                  <Text style={styles.logoLine2}>Dates</Text>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveLabel}>Live Tonight</Text>
                  </View>
                </View>
                <View style={styles.headerRight}>
                  <TouchableOpacity style={styles.locationPill} onPress={() => nav('/city-picker')}>
                    <Ionicons name="location" size={12} color={COLORS.orange} />
                    <Text style={styles.locationText}>{selectedCity.name}</Text>
                    <Ionicons name="chevron-down" size={10} color={COLORS.muted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bellBtn} onPress={() => nav('/notifications')}>
                    <Ionicons name="notifications-outline" size={20} color={COLORS.cream} />
                    <View style={styles.bellDot} />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>

            {/* ── Search bar ── */}
            <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={() => nav('/search')}>
              <View style={styles.searchIconBg}>
                <Ionicons name="search" size={13} color={COLORS.orange} />
              </View>
              <Text style={styles.searchHint}>Search spots, zip, neighborhood…</Text>
              <View style={styles.searchDivider} />
              <Ionicons name="options-outline" size={16} color={COLORS.muted} />
            </TouchableOpacity>

            {/* ── Filter chips ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {FILTER_CHIPS.map((chip) => {
                const active = activeFilter === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => handleFilter(chip.id)}
                  >
                    {chip.isLive && (
                      <Animated.View
                        style={[
                          styles.chipLiveDot,
                          {
                            opacity: active ? pulseOpacity : 0.35,
                            transform: [{ scale: active ? pulseScale : 1 }],
                          },
                        ]}
                      />
                    )}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── Happening Now ── */}
            {happeningNow.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Animated.View
                      style={[
                        styles.sectionLiveDot,
                        { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
                      ]}
                    />
                    <Text style={styles.sectionTitle}>Happening Now</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{happeningNow.length}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleFilter('now')}>
                    <Text style={styles.seeAll}>See all →</Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={happeningNow.slice(0, 6)}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.spotCardsRow}
                  renderItem={({ item }) => <SpotCard restaurant={item} />}
                  ItemSeparatorComponent={() => <View style={{ width: SPACING.md }} />}
                />
              </>
            )}

            {/* ── Feeling Lucky ── */}
            <LinearGradient
              colors={['rgba(255,107,26,0.20)', 'rgba(255,107,26,0.07)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.luckyOuter}
            >
              <TouchableOpacity
                style={styles.luckyInner}
                activeOpacity={0.82}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  const picks = happeningNow.length ? happeningNow : restaurants;
                  if (picks.length) {
                    const pick = picks[Math.floor(Math.random() * picks.length)];
                    nav({ pathname: '/restaurant/[id]', params: { id: pick.id } });
                  }
                }}
              >
                <Text style={styles.luckyEmoji}>🎲</Text>
                <View style={styles.luckyText}>
                  <Text style={styles.luckyTitle}>Feeling Lucky?</Text>
                  <Text style={styles.luckySub}>One tap → perfect spot near you</Text>
                </View>
                <View style={styles.luckyArrowCircle}>
                  <Ionicons name="arrow-forward" size={15} color={COLORS.orange} />
                </View>
              </TouchableOpacity>
            </LinearGradient>

            {/* ── All Happy Hours ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Happy Hours</Text>
              <Text style={styles.sectionCount}>{filtered.length} spot{filtered.length !== 1 ? 's' : ''}</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🍸</Text>
              <Text style={styles.emptyTitle}>No spots found</Text>
              <Text style={styles.emptySub}>Try a different filter</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  listContent: {},
  loadingOverlay: { position: 'absolute', top: 120, left: 0, right: 0, alignItems: 'center', zIndex: 10 },

  // ── Header ──
  headerGradient: { paddingBottom: SPACING.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  logoLine1: {
    fontFamily: FONTS.playfair,
    fontSize: 27,
    color: COLORS.orange,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  logoLine2: {
    fontFamily: FONTS.playfair,
    fontSize: 27,
    color: COLORS.amber,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: COLORS.status.success,
  },
  liveLabel: {
    fontFamily: FONTS.dmMedium,
    fontSize: 11,
    color: COLORS.status.success,
    letterSpacing: 0.4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: 4,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.overlay.orange10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border.default,
  },
  locationText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.cream },
  bellBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border.default,
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: COLORS.status.error,
    borderWidth: 1.5,
    borderColor: COLORS.dark,
  },

  // ── Search ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(255,248,240,0.07)',
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.border.strong,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  searchIconBg: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.overlay.orange15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchHint: { flex: 1, fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.faded },
  searchDivider: { width: 1, height: 16, backgroundColor: COLORS.border.subtle },

  // ── Filter chips ──
  chipsRow: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border.default,
  },
  chipActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  chipText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.faded },
  chipTextActive: { color: '#FFFFFF' },
  chipLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: COLORS.status.error,
  },

  // ── Section headers ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontFamily: FONTS.playfair, fontSize: 20, color: COLORS.cream },
  seeAll: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.orange },
  sectionCount: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted },
  sectionLiveDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: COLORS.status.error,
  },
  countBadge: {
    backgroundColor: COLORS.overlay.orange20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border.default,
  },
  countBadgeText: { fontFamily: FONTS.dmMedium, fontSize: 10, color: COLORS.orange },

  // ── SpotCard ──
  spotCardsRow: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  spotCardWrapper: {
    width: 215,
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  spotCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    overflow: 'hidden',
  },
  spotCardGradient: {
    height: 110,
    padding: SPACING.sm,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  spotBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  crowdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  crowdDot: { width: 5, height: 5, borderRadius: 99 },
  crowdBadgeText: { fontFamily: FONTS.dmMedium, fontSize: 9, letterSpacing: 0.2 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orange,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  verifiedText: { fontFamily: FONTS.dmMedium, fontSize: 9, color: '#FFFFFF' },
  emojiRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(26,10,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,248,240,0.10)',
  },
  spotEmoji: { fontSize: 26 },
  spotCardBody: { padding: SPACING.md },
  spotName: {
    fontFamily: FONTS.dmMedium,
    fontSize: 15,
    color: COLORS.cream,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  spotMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: SPACING.sm },
  spotMeta: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },
  spotDot: { fontSize: 10, color: COLORS.muted },
  dealPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: SPACING.sm },
  dealPill: {
    backgroundColor: 'rgba(255,179,71,0.12)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,179,71,0.25)',
  },
  dealText: { fontFamily: FONTS.dmMedium, fontSize: 10, color: COLORS.amber },
  spotFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countdownText: { fontFamily: FONTS.dmMedium, fontSize: 11 },
  spotFooterRight: { alignItems: 'flex-end', gap: 4 },

  // ── Feeling Lucky ──
  luckyOuter: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border.strong,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 14,
    elevation: 6,
  },
  luckyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  luckyEmoji: { fontSize: 34 },
  luckyText: { flex: 1 },
  luckyTitle: { fontFamily: FONTS.dmMedium, fontSize: 16, color: COLORS.cream },
  luckySub: {
    fontFamily: FONTS.dmRegular,
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  luckyArrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.overlay.orange15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.default,
  },

  // ── List cards ──
  listCardWrapper: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  listAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    zIndex: 2,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    paddingLeft: SPACING.lg,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  listEmojiBg: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listEmoji: { fontSize: 26 },
  listCardContent: { flex: 1, gap: 4 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listName: {
    fontFamily: FONTS.dmMedium,
    fontSize: 15,
    color: COLORS.cream,
    flex: 1,
    marginRight: SPACING.sm,
    letterSpacing: -0.2,
  },
  listTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  listTime: { fontFamily: FONTS.dmMedium, fontSize: 12 },
  listMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  listMeta: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },
  listDot: { fontSize: 10, color: COLORS.muted },
  checkinsText: { fontFamily: FONTS.dmMedium, fontSize: 11 },
  listTags: { flexDirection: 'row', gap: 4 },
  listTag: {
    backgroundColor: COLORS.overlay.orange10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  listTagText: { fontFamily: FONTS.dmRegular, fontSize: 10, color: COLORS.amber },

  // ── Empty ──
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.lg },
  emptyTitle: { fontFamily: FONTS.playfair, fontSize: 22, color: COLORS.cream, marginBottom: SPACING.sm },
  emptySub: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted },

  // ── Chat FAB ──
  chatFab: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 20,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  chatFabInner: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Error ──
  errorState: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    padding: SPACING.xxxl, zIndex: 5,
  },
  errorTitle: { fontFamily: FONTS.playfair, fontSize: 22, color: COLORS.cream, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  errorSub: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted, marginBottom: SPACING.xl, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  retryText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: '#fff' },
});
