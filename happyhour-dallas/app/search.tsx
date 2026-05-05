import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';
import { useRestaurantStore, type Restaurant } from '@/store/restaurantStore';
import { getActiveHappyHour, getRestaurantEmoji, getTopDeals } from '@/lib/happyHourHelpers';

// ─── Static data ──────────────────────────────────────────────────────────────

const RECENT_SEARCHES = ['Uptown rooftop', 'Deep Ellum cocktails', '$5 drinks', 'Date night'];

const QUICK_CATEGORIES = [
  { id: 'rooftop', label: '🏙️ Rooftop', color: '#0A84FF' },
  { id: 'livemusic', label: '🎵 Live Music', color: '#BF5AF2' },
  { id: 'patio', label: '🌿 Patio', color: '#34C759' },
  { id: 'datenight', label: '💑 Date Night', color: '#FF375F' },
  { id: 'dogfriendly', label: '🐶 Dog Friendly', color: '#FF9500' },
  { id: 'sports', label: '🏈 Sports Bar', color: '#30B0C7' },
];

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({ item }: { item: Restaurant }) {
  const hh = getActiveHappyHour(item);
  const isActive = hh !== null;
  const emoji = getRestaurantEmoji(item);
  const deals = getTopDeals(item);

  return (
    <TouchableOpacity
      style={styles.resultRow}
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: item.id } } as any)}
    >
      <View style={[
        styles.resultEmojiBg,
        { backgroundColor: isActive ? COLORS.overlay.orange15 : COLORS.overlay.inputBg },
      ]}>
        <Text style={styles.resultEmoji}>{emoji}</Text>
      </View>

      <View style={styles.resultContent}>
        <View style={styles.resultTitleRow}>
          <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
          {isActive && <View style={styles.activePill}><Text style={styles.activePillText}>Now</Text></View>}
        </View>
        <View style={styles.resultMeta}>
          <Ionicons name="location-outline" size={10} color={COLORS.muted} />
          <Text style={styles.resultNeighborhood}>{item.neighborhood ?? 'Dallas'}</Text>
          <Text style={styles.resultDot}>·</Text>
          <Ionicons name="star" size={10} color={COLORS.gold} />
          <Text style={styles.resultRating}>{item.average_rating.toFixed(1)}</Text>
        </View>
        {deals[0] ? (
          <Text style={styles.resultDeal} numberOfLines={1}>{deals[0]}</Text>
        ) : item.cuisine_type ? (
          <Text style={styles.resultDeal} numberOfLines={1}>{item.cuisine_type}</Text>
        ) : null}
      </View>

      <View style={styles.resultRight}>
        <Text style={styles.resultEndTime}>{hh ? hh.endTime : '—'}</Text>
        <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const { searchResults, searchLoading, searchRestaurants, clearSearch } = useRestaurantStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      clearSearch();
      return;
    }
    const timer = setTimeout(() => {
      searchRestaurants(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleCategory = (label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Strip leading emoji + space from label before searching
    const stripped = label.replace(/^[\p{Emoji}\s]+/u, '').trim();
    setQuery(stripped);
  };

  const showRecent = !query.trim();
  const showResults = !!query.trim();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.orange} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search spots, neighborhoods, deals…"
            placeholderTextColor={COLORS.faded}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            keyboardAppearance="dark"
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {searchLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.orange} />
        </View>
      )}

      {/* Recent + categories */}
      {showRecent && !searchLoading && (
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => ''}
          ListHeaderComponent={
            <>
              <Text style={styles.sectionLabel}>Quick filters</Text>
              <View style={styles.categoryGrid}>
                {QUICK_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, { borderColor: cat.color + '40', backgroundColor: cat.color + '15' }]}
                    onPress={() => handleCategory(cat.label)}
                  >
                    <Text style={[styles.categoryLabel, { color: cat.color }]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Recent searches</Text>
              {RECENT_SEARCHES.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.recentRow}
                  onPress={() => setQuery(term)}
                >
                  <Ionicons name="time-outline" size={16} color={COLORS.muted} />
                  <Text style={styles.recentText}>{term}</Text>
                  <Ionicons name="arrow-up-back-outline" size={14} color={COLORS.muted} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              ))}
            </>
          }
        />
      )}

      {/* Results */}
      {showResults && !searchLoading && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ResultRow item={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.resultsList}
          ListHeaderComponent={
            searchResults.length > 0 ? (
              <Text style={styles.resultCount}>
                {searchResults.length} spot{searchResults.length !== 1 ? 's' : ''} found
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.emptyBody}>Try a different neighborhood, deal type, or vibe.</Text>
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

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border.strong,
    paddingHorizontal: SPACING.md,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.dmRegular,
    fontSize: 15,
    color: COLORS.cream,
  },
  cancelBtn: { paddingHorizontal: SPACING.xs },
  cancelText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.orange },

  loadingRow: { paddingTop: SPACING.xxl, alignItems: 'center' },

  sectionLabel: {
    fontFamily: FONTS.dmMedium,
    fontSize: 12,
    color: COLORS.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  categoryLabel: { fontFamily: FONTS.dmMedium, fontSize: 13 },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  recentText: { fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.cream },

  resultCount: {
    fontFamily: FONTS.dmRegular,
    fontSize: 13,
    color: COLORS.muted,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  resultsList: { paddingBottom: 48 },
  separator: { height: 1, backgroundColor: COLORS.border.subtle, marginLeft: 74 },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  resultEmojiBg: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultEmoji: { fontSize: 26 },
  resultContent: { flex: 1 },
  resultTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 3 },
  resultName: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.cream, flex: 1 },
  activePill: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  activePillText: { fontFamily: FONTS.dmMedium, fontSize: 10, color: '#FFF' },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 },
  resultNeighborhood: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },
  resultDot: { fontSize: 10, color: COLORS.muted },
  resultRating: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.gold },
  resultDeal: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.amber },
  resultRight: { alignItems: 'flex-end', gap: 4 },
  resultEndTime: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.muted },

  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: SPACING.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.lg },
  emptyTitle: { fontFamily: FONTS.playfair, fontSize: 24, color: COLORS.cream, marginBottom: SPACING.sm },
  emptyBody: { fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 22 },
});
