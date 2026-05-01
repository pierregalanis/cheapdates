import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Restaurant {
  id: string;
  name: string;
  neighborhood: string;
  emoji: string;
  happyHourEnd: string;
  rating: number;
  reviewCount: number;
  distance: string;
  crowdLevel: 0 | 1 | 2 | 3 | 4;
  isVerified: boolean;
  tags: string[];
  deals: string[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

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

const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    name: 'Bottled Blonde',
    neighborhood: 'Uptown',
    emoji: '🍸',
    happyHourEnd: '7:00 PM',
    rating: 4.6,
    reviewCount: 284,
    distance: '0.3 mi',
    crowdLevel: 3,
    isVerified: true,
    tags: ['Rooftop', 'Date Night'],
    deals: ['$5 cocktails', '$4 draft beer'],
  },
  {
    id: '2',
    name: 'Happiest Hour',
    neighborhood: 'Uptown',
    emoji: '🍺',
    happyHourEnd: '7:30 PM',
    rating: 4.8,
    reviewCount: 512,
    distance: '0.5 mi',
    crowdLevel: 4,
    isVerified: true,
    tags: ['Sports Bar', 'Lively'],
    deals: ['$3 domestic beer', '$5 wells'],
  },
  {
    id: '3',
    name: 'Off the Record',
    neighborhood: 'Deep Ellum',
    emoji: '🎵',
    happyHourEnd: '8:00 PM',
    rating: 4.4,
    reviewCount: 178,
    distance: '1.2 mi',
    crowdLevel: 2,
    isVerified: true,
    tags: ['Live Music', 'Cocktails'],
    deals: ['$6 craft cocktails', '$4 wine'],
  },
  {
    id: '4',
    name: 'The Rustic',
    neighborhood: 'Design District',
    emoji: '🌿',
    happyHourEnd: '7:00 PM',
    rating: 4.5,
    reviewCount: 391,
    distance: '0.8 mi',
    crowdLevel: 2,
    isVerified: true,
    tags: ['Patio', 'Dog Friendly'],
    deals: ['$5 margaritas', '$8 apps'],
  },
  {
    id: '5',
    name: 'Common Table',
    neighborhood: 'Uptown',
    emoji: '🍺',
    happyHourEnd: '6:30 PM',
    rating: 4.3,
    reviewCount: 156,
    distance: '0.4 mi',
    crowdLevel: 1,
    isVerified: false,
    tags: ['Craft Beer', 'Quiet & Cozy'],
    deals: ['$1 off all drafts', '$6 house wine'],
  },
  {
    id: '6',
    name: 'Taco y Vino',
    neighborhood: 'Oak Cliff',
    emoji: '🌮',
    happyHourEnd: '7:00 PM',
    rating: 4.7,
    reviewCount: 223,
    distance: '2.1 mi',
    crowdLevel: 2,
    isVerified: true,
    tags: ['Date Night', 'Wine Bar'],
    deals: ['$3 tacos', '$5 margaritas'],
  },
];

// ─── Crowd Config ─────────────────────────────────────────────────────────────

const CROWD = {
  0: { label: 'Unknown', color: COLORS.muted },
  1: { label: 'Quiet', color: COLORS.status.success },
  2: { label: 'Getting Busy', color: COLORS.amber },
  3: { label: 'Busy', color: COLORS.orange },
  4: { label: 'Packed', color: COLORS.status.error },
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function CrowdMeter({ level }: { level: number }) {
  const config = CROWD[level as keyof typeof CROWD] ?? CROWD[0];
  return (
    <View style={styles.crowdMeter}>
      {[1, 2, 3, 4].map((bar) => (
        <View
          key={bar}
          style={[styles.crowdBar, bar <= level && { backgroundColor: config.color }]}
        />
      ))}
    </View>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.starRow}>
      <Ionicons name="star" size={11} color={COLORS.gold} />
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function SpotCard({ restaurant }: { restaurant: Restaurant }) {
  const crowd = CROWD[restaurant.crowdLevel];
  return (
    <TouchableOpacity style={styles.spotCard} activeOpacity={0.82}>
      <LinearGradient
        colors={['rgba(255,107,26,0.22)', 'rgba(255,107,26,0.04)']}
        style={styles.spotCardGradient}
      >
        <View style={styles.spotBadgeRow}>
          <View style={[styles.crowdBadge, { backgroundColor: crowd.color + '28' }]}>
            <View style={[styles.crowdDot, { backgroundColor: crowd.color }]} />
            <Text style={[styles.crowdBadgeText, { color: crowd.color }]}>{crowd.label}</Text>
          </View>
          {restaurant.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>
        <Text style={styles.spotEmoji}>{restaurant.emoji}</Text>
      </LinearGradient>

      <View style={styles.spotCardBody}>
        <Text style={styles.spotName} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={styles.spotNeighborhood}>{restaurant.neighborhood}</Text>

        <View style={styles.spotDealsContainer}>
          {restaurant.deals.slice(0, 2).map((deal, i) => (
            <Text key={i} style={styles.spotDeal} numberOfLines={1}>• {deal}</Text>
          ))}
        </View>

        <View style={styles.spotFooter}>
          <View>
            <Text style={styles.endTimeLabel}>Ends</Text>
            <Text style={styles.endTime}>{restaurant.happyHourEnd}</Text>
          </View>
          <View style={styles.spotFooterRight}>
            <StarRating rating={restaurant.rating} />
            <CrowdMeter level={restaurant.crowdLevel} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ListCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <TouchableOpacity style={styles.listCard} activeOpacity={0.82}>
      <View style={styles.listEmojiBg}>
        <Text style={styles.listEmoji}>{restaurant.emoji}</Text>
      </View>
      <View style={styles.listCardContent}>
        <View style={styles.listRow}>
          <Text style={styles.listName} numberOfLines={1}>{restaurant.name}</Text>
          <Text style={styles.listTime}>{restaurant.happyHourEnd}</Text>
        </View>
        <View style={styles.listRow}>
          <Text style={styles.listNeighborhood}>{restaurant.neighborhood}</Text>
          <Text style={styles.listDistance}>{restaurant.distance}</Text>
        </View>
        <View style={styles.listRow}>
          <View style={styles.listTags}>
            {restaurant.tags.slice(0, 2).map((tag) => (
              <View key={tag} style={styles.listTag}>
                <Text style={styles.listTagText}>{tag}</Text>
              </View>
            ))}
          </View>
          <StarRating rating={restaurant.rating} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const [activeFilter, setActiveFilter] = useState('now');
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const handleFilter = (id: string) => {
    setActiveFilter(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <FlatList
        data={MOCK_RESTAURANTS}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
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
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.logoLine1}>HappyHour</Text>
                <Text style={styles.logoLine2}>Dallas</Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.locationPill}>
                  <Ionicons name="location" size={12} color={COLORS.orange} />
                  <Text style={styles.locationText}>Uptown</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bellBtn}>
                  <Ionicons name="notifications-outline" size={21} color={COLORS.cream} />
                  <View style={styles.bellDot} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search */}
            <TouchableOpacity style={styles.searchBar} activeOpacity={0.75}>
              <Ionicons name="search" size={15} color={COLORS.muted} />
              <Text style={styles.searchHint}>Search spots, zip, neighborhood…</Text>
            </TouchableOpacity>

            {/* Filter chips */}
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
                        style={[styles.chipLiveDot, { opacity: active ? pulseAnim : 0.4 }]}
                      />
                    )}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Happening Now */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Animated.View style={[styles.livePulse, { opacity: pulseAnim }]} />
                <Text style={styles.sectionTitle}>Happening Now</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={MOCK_RESTAURANTS.slice(0, 4)}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.spotCardsRow}
              renderItem={({ item }) => <SpotCard restaurant={item} />}
              ItemSeparatorComponent={() => <View style={{ width: SPACING.md }} />}
            />

            {/* Feeling Lucky */}
            <TouchableOpacity
              style={styles.luckyBtn}
              activeOpacity={0.8}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            >
              <Text style={styles.luckyEmoji}>🎲</Text>
              <View style={styles.luckyText}>
                <Text style={styles.luckyTitle}>Feeling Lucky?</Text>
                <Text style={styles.luckySub}>Pick a random verified spot near you</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.orange} />
            </TouchableOpacity>

            {/* All Happy Hours */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Happy Hours</Text>
              <Text style={styles.sectionCount}>{MOCK_RESTAURANTS.length} spots</Text>
            </View>
          </>
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  listContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  logoLine1: { fontFamily: FONTS.playfair, fontSize: 21, color: COLORS.orange, lineHeight: 24 },
  logoLine2: { fontFamily: FONTS.playfair, fontSize: 21, color: COLORS.amber, lineHeight: 24 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.overlay.orange10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  locationText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.cream },
  bellBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: COLORS.orange,
    borderWidth: 1.5,
    borderColor: COLORS.dark,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  searchHint: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.faded },

  chipsRow: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border.default,
  },
  chipActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  chipText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.faded },
  chipTextActive: { color: '#FFFFFF' },
  chipLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.status.error },

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
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.status.error },

  spotCardsRow: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  spotCard: {
    width: 195,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    overflow: 'hidden',
  },
  spotCardGradient: {
    height: 96,
    padding: SPACING.sm,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  spotBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  crowdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  crowdDot: { width: 5, height: 5, borderRadius: 99 },
  crowdBadgeText: { fontFamily: FONTS.dmMedium, fontSize: 9 },
  verifiedBadge: { backgroundColor: COLORS.orange, paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.full },
  verifiedText: { fontFamily: FONTS.dmMedium, fontSize: 9, color: '#FFFFFF' },
  spotEmoji: { fontSize: 30, alignSelf: 'center' },
  spotCardBody: { padding: SPACING.sm },
  spotName: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.cream, marginBottom: 1 },
  spotNeighborhood: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted, marginBottom: SPACING.xs },
  spotDealsContainer: { marginBottom: SPACING.sm },
  spotDeal: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.amber, lineHeight: 16 },
  spotFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  endTimeLabel: { fontFamily: FONTS.dmRegular, fontSize: 10, color: COLORS.muted },
  endTime: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.orange },
  spotFooterRight: { alignItems: 'flex-end', gap: 4 },

  crowdMeter: { flexDirection: 'row', gap: 2 },
  crowdBar: { width: 13, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,248,240,0.12)' },

  starRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontFamily: FONTS.dmMedium, fontSize: 11, color: COLORS.gold },

  luckyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    padding: SPACING.md,
  },
  luckyEmoji: { fontSize: 30 },
  luckyText: { flex: 1 },
  luckyTitle: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.cream },
  luckySub: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, marginTop: 1 },

  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  listEmojiBg: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.orange15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listEmoji: { fontSize: 24 },
  listCardContent: { flex: 1, gap: 3 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listName: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.cream, flex: 1, marginRight: SPACING.sm },
  listTime: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.orange },
  listNeighborhood: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },
  listDistance: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },
  listTags: { flexDirection: 'row', gap: 4 },
  listTag: { backgroundColor: COLORS.overlay.orange10, paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.sm },
  listTagText: { fontFamily: FONTS.dmRegular, fontSize: 10, color: COLORS.amber },
});
