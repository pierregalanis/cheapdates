import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

const { height: SCREEN_H } = Dimensions.get('window');

// ─── Dallas coordinates ───────────────────────────────────────────────────────

const DALLAS_CENTER: Region = {
  latitude: 32.7950,
  longitude: -96.8100,
  latitudeDelta: 0.055,
  longitudeDelta: 0.055,
};

// ─── Mock restaurants with coordinates ───────────────────────────────────────

interface MapSpot {
  id: string;
  name: string;
  emoji: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  crowdLevel: 0 | 1 | 2 | 3 | 4;
  isActive: boolean;
  minLeft: number;
  deals: string[];
  rating: number;
  distance: string;
}

const MAP_SPOTS: MapSpot[] = [
  { id: '1', name: 'Bottled Blonde',  emoji: '🍸', neighborhood: 'Uptown',          latitude: 32.7961, longitude: -96.8082, crowdLevel: 3, isActive: true,  minLeft: 47,  deals: ['$5 cocktails', '$4 draft'],  rating: 4.6, distance: '0.3 mi' },
  { id: '2', name: 'Happiest Hour',   emoji: '🍺', neighborhood: 'Uptown',          latitude: 32.7940, longitude: -96.8075, crowdLevel: 4, isActive: true,  minLeft: 77,  deals: ['$3 domestic', '$5 wells'],   rating: 4.8, distance: '0.5 mi' },
  { id: '3', name: 'Off the Record',  emoji: '🎵', neighborhood: 'Deep Ellum',      latitude: 32.7820, longitude: -96.7820, crowdLevel: 2, isActive: true,  minLeft: 107, deals: ['$6 cocktails', '$4 wine'],   rating: 4.4, distance: '1.2 mi' },
  { id: '4', name: 'The Rustic',      emoji: '🌿', neighborhood: 'Design District', latitude: 32.8001, longitude: -96.8218, crowdLevel: 2, isActive: true,  minLeft: 47,  deals: ['$5 margaritas', '$8 apps'],  rating: 4.5, distance: '0.8 mi' },
  { id: '5', name: 'Common Table',    emoji: '🍺', neighborhood: 'Uptown',          latitude: 32.7955, longitude: -96.8060, crowdLevel: 1, isActive: false, minLeft: 0,   deals: ['$1 off drafts'],              rating: 4.3, distance: '0.4 mi' },
  { id: '6', name: 'Taco y Vino',     emoji: '🌮', neighborhood: 'Oak Cliff',       latitude: 32.7455, longitude: -96.8210, crowdLevel: 2, isActive: true,  minLeft: 47,  deals: ['$3 tacos', '$5 margaritas'], rating: 4.7, distance: '2.1 mi' },
];

const NEIGHBORHOOD_FILTERS = ['All', 'Uptown', 'Deep Ellum', 'Design District', 'Oak Cliff'];

const CROWD_COLOR = {
  0: COLORS.muted,
  1: '#34C759',
  2: '#FFB347',
  3: '#FF6B1A',
  4: '#FF3B30',
} as const;

// ─── Dark map style (Google Maps Night) ──────────────────────────────────────

const DARK_MAP_STYLE = [
  { elementType: 'geometry',                     stylers: [{ color: '#1a0a00' }] },
  { elementType: 'labels.text.fill',             stylers: [{ color: '#8a6a50' }] },
  { elementType: 'labels.text.stroke',           stylers: [{ color: '#1a0a00' }] },
  { featureType: 'road',                         elementType: 'geometry', stylers: [{ color: '#2a1500' }] },
  { featureType: 'road',                         elementType: 'geometry.stroke', stylers: [{ color: '#3d1f00' }] },
  { featureType: 'road.highway',                 elementType: 'geometry', stylers: [{ color: '#3d1f00' }] },
  { featureType: 'road.highway',                 elementType: 'geometry.stroke', stylers: [{ color: '#1a0a00' }] },
  { featureType: 'road.highway',                 elementType: 'labels.text.fill', stylers: [{ color: '#ff6b1a' }] },
  { featureType: 'water',                        elementType: 'geometry', stylers: [{ color: '#0d0500' }] },
  { featureType: 'water',                        elementType: 'labels.text.fill', stylers: [{ color: '#3d1f00' }] },
  { featureType: 'poi',                          stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',                      stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative',               elementType: 'geometry', stylers: [{ color: '#3d1f00' }] },
  { featureType: 'administrative.country',       elementType: 'labels.text.fill', stylers: [{ color: '#ff6b1a' }] },
  { featureType: 'administrative.locality',      elementType: 'labels.text.fill', stylers: [{ color: '#ffb347' }] },
  { featureType: 'administrative.neighborhood',  elementType: 'labels.text.fill', stylers: [{ color: '#8a6a50' }] },
  { featureType: 'landscape',                    elementType: 'geometry', stylers: [{ color: '#200f00' }] },
];

// ─── Custom marker ────────────────────────────────────────────────────────────

function SpotMarker({ spot, selected }: { spot: MapSpot; selected: boolean }) {
  const color = CROWD_COLOR[spot.crowdLevel];
  return (
    <View style={[styles.markerOuter, selected && { transform: [{ scale: 1.15 }] }]}>
      <View style={[styles.markerBubble, { backgroundColor: spot.isActive ? color : COLORS.surface, borderColor: spot.isActive ? color : COLORS.border.default }]}>
        <Text style={styles.markerEmoji}>{spot.emoji}</Text>
      </View>
      <View style={[styles.markerPin, { borderTopColor: spot.isActive ? color : COLORS.surface }]} />
    </View>
  );
}

// ─── Bottom card ─────────────────────────────────────────────────────────────

function SpotCard({ spot, onClose }: { spot: MapSpot; onClose: () => void }) {
  const color = CROWD_COLOR[spot.crowdLevel];
  const countdownColor = spot.minLeft <= 30 ? COLORS.status.error : spot.minLeft <= 60 ? COLORS.amber : COLORS.orange;
  const CROWD_LABEL = { 0: 'Unknown', 1: 'Quiet', 2: 'Getting Busy', 3: 'Busy', 4: 'Packed 🔥' };

  return (
    <View style={styles.bottomCard}>
      <View style={styles.cardHandle} />

      <View style={styles.cardHeader}>
        <View style={[styles.cardEmojiBg, { backgroundColor: color + '20' }]}>
          <Text style={styles.cardEmoji}>{spot.emoji}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{spot.name}</Text>
          <View style={styles.cardMetaRow}>
            <Ionicons name="location-outline" size={11} color={COLORS.muted} />
            <Text style={styles.cardMeta}>{spot.neighborhood}</Text>
            <Text style={styles.cardDot}>·</Text>
            <Text style={styles.cardMeta}>{spot.distance}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={16} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.cardStatItem}>
          <View style={[styles.crowdDot, { backgroundColor: color }]} />
          <Text style={[styles.cardStatText, { color }]}>{CROWD_LABEL[spot.crowdLevel]}</Text>
        </View>
        <View style={styles.cardStatDivider} />
        <View style={styles.cardStatItem}>
          <Ionicons name="star" size={12} color={COLORS.gold} />
          <Text style={styles.cardStatText}>{spot.rating.toFixed(1)}</Text>
        </View>
        <View style={styles.cardStatDivider} />
        {spot.isActive ? (
          <View style={styles.cardStatItem}>
            <Ionicons name="time-outline" size={12} color={countdownColor} />
            <Text style={[styles.cardStatText, { color: countdownColor }]}>{spot.minLeft}m left</Text>
          </View>
        ) : (
          <View style={styles.cardStatItem}>
            <Text style={[styles.cardStatText, { color: COLORS.muted }]}>Ended</Text>
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealsRow}>
        {spot.deals.map((deal) => (
          <View key={deal} style={styles.dealPill}>
            <Text style={styles.dealText}>{deal}</Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.viewBtn}
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: spot.id } } as any)}
      >
        <Text style={styles.viewBtnText}>View Details</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const cardAnim = useRef(new Animated.Value(0)).current;

  const [selectedSpot, setSelectedSpot] = useState<MapSpot | null>(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const filteredSpots = activeFilter === 'All'
    ? MAP_SPOTS
    : MAP_SPOTS.filter((s) => s.neighborhood === activeFilter);

  const selectSpot = useCallback((spot: MapSpot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSpot(spot);
    mapRef.current?.animateToRegion({
      latitude: spot.latitude - 0.004,
      longitude: spot.longitude,
      latitudeDelta: 0.018,
      longitudeDelta: 0.018,
    }, 350);
    Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 10 }).start();
  }, [cardAnim]);

  const deselectSpot = useCallback(() => {
    Animated.timing(cardAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setSelectedSpot(null);
    });
  }, [cardAnim]);

  const goToMyLocation = async () => {
    setLocationLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      }, 600);
    }
    setLocationLoading(false);
  };

  const handleFilterChange = (filter: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilter(filter);
    deselectSpot();
    if (filter !== 'All') {
      const inFilter = MAP_SPOTS.filter((s) => s.neighborhood === filter);
      if (inFilter.length > 0) {
        const avgLat = inFilter.reduce((s, p) => s + p.latitude, 0) / inFilter.length;
        const avgLng = inFilter.reduce((s, p) => s + p.longitude, 0) / inFilter.length;
        mapRef.current?.animateToRegion({ latitude: avgLat, longitude: avgLng, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 500);
      }
    } else {
      mapRef.current?.animateToRegion(DALLAS_CENTER, 500);
    }
  };

  const cardTranslateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [280, 0] });

  const activeCount = filteredSpots.filter((s) => s.isActive).length;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={DALLAS_CENTER}
        customMapStyle={DARK_MAP_STYLE}
        onMapReady={() => setMapReady(true)}
        onPress={deselectSpot}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {mapReady && filteredSpots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            onPress={() => selectSpot(spot)}
            tracksViewChanges={false}
          >
            <SpotMarker spot={spot} selected={selectedSpot?.id === spot.id} />
          </Marker>
        ))}
      </MapView>

      {/* ── Top overlay ── */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + SPACING.sm }]}>
        {/* Header bar */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Map</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{activeCount} live</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.listViewBtn} onPress={() => router.push('/')}>
            <Ionicons name="list" size={16} color={COLORS.cream} />
            <Text style={styles.listViewText}>List</Text>
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {NEIGHBORHOOD_FILTERS.map((f) => {
            const active = activeFilter === f;
            const count = f === 'All' ? MAP_SPOTS.length : MAP_SPOTS.filter((s) => s.neighborhood === f).length;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => handleFilterChange(f)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f}
                </Text>
                {count > 0 && (
                  <View style={[styles.filterCount, active && styles.filterCountActive]}>
                    <Text style={[styles.filterCountText, active && { color: COLORS.orange }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Location button ── */}
      <TouchableOpacity
        style={[styles.locationBtn, { bottom: selectedSpot ? 290 : insets.bottom + 100 }]}
        onPress={goToMyLocation}
        activeOpacity={0.85}
      >
        {locationLoading ? (
          <ActivityIndicator size="small" color={COLORS.orange} />
        ) : (
          <Ionicons name="locate" size={20} color={COLORS.orange} />
        )}
      </TouchableOpacity>

      {/* ── Bottom spot card ── */}
      {selectedSpot && (
        <Animated.View
          style={[
            styles.bottomCardWrap,
            { paddingBottom: insets.bottom + SPACING.md, transform: [{ translateY: cardTranslateY }] },
          ]}
        >
          <SpotCard spot={selectedSpot} onClose={deselectSpot} />
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.dark },

  // Top overlay
  topOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: 'rgba(26,10,0,0.88)',
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerTitle: { fontFamily: FONTS.playfair, fontSize: 20, color: COLORS.cream },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.overlay.orange15,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border.default,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.status.success },
  liveText: { fontFamily: FONTS.dmMedium, fontSize: 11, color: COLORS.status.success },
  listViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.overlay.inputBg,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  listViewText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.cream },

  // Filter chips
  filtersRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.sm },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(26,10,0,0.82)',
    borderWidth: 1, borderColor: COLORS.border.default,
  },
  filterChipActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 6,
  },
  filterChipText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.muted },
  filterChipTextActive: { color: '#fff' },
  filterCount: {
    backgroundColor: COLORS.overlay.orange20,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterCountText: { fontFamily: FONTS.dmMedium, fontSize: 10, color: COLORS.muted },

  // Location button
  locationBtn: {
    position: 'absolute',
    right: SPACING.lg,
    width: 46, height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(26,10,0,0.90)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 8,
    zIndex: 10,
  },

  // Marker
  markerOuter: { alignItems: 'center' },
  markerBubble: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 6,
  },
  markerEmoji: { fontSize: 22 },
  markerPin: {
    width: 0, height: 0,
    borderLeftWidth: 7, borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },

  // Bottom card
  bottomCardWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    zIndex: 20,
    paddingHorizontal: SPACING.lg,
  },
  bottomCard: {
    backgroundColor: 'rgba(26,10,0,0.97)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 20,
  },
  cardHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border.strong,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  cardEmojiBg: { width: 50, height: 50, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 26 },
  cardInfo: { flex: 1 },
  cardName: { fontFamily: FONTS.dmMedium, fontSize: 17, color: COLORS.cream, marginBottom: 3, letterSpacing: -0.2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardMeta: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },
  cardDot: { color: COLORS.muted, fontSize: 10 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  cardStatItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  crowdDot: { width: 7, height: 7, borderRadius: 99 },
  cardStatText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.cream },
  cardStatDivider: { width: 1, height: 16, backgroundColor: COLORS.border.subtle },
  dealsRow: { gap: SPACING.sm, paddingBottom: SPACING.md },
  dealPill: {
    backgroundColor: 'rgba(255,179,71,0.13)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(255,179,71,0.28)',
  },
  dealText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.amber },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.full,
    height: 50,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 7,
  },
  viewBtnText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: '#FFFFFF' },
});
