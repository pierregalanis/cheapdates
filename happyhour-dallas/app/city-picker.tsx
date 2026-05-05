import React from 'react';
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
import * as Haptics from 'expo-haptics';
import { useCityStore } from '@/store/cityStore';
import { useRestaurantStore } from '@/store/restaurantStore';
import { CITIES, type CityConfig } from '@/constants/cities';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

export default function CityPickerScreen() {
  const { selectedCity, setCity } = useCityStore();
  const fetchRestaurants = useRestaurantStore((s) => s.fetchRestaurants);

  const handleSelect = async (city: CityConfig) => {
    if (city.comingSoon) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setCity(city.id);
    // Force-refetch restaurants for the new city
    fetchRestaurants({ force: true, city: city.name });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose City</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>More cities launching soon</Text>

      <FlatList
        data={CITIES}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const isSelected = item.id === selectedCity.id;
          const disabled = item.comingSoon;
          return (
            <TouchableOpacity
              style={[styles.row, disabled && styles.rowDisabled]}
              onPress={() => handleSelect(item)}
              activeOpacity={disabled ? 1 : 0.75}
            >
              <Text style={styles.cityEmoji}>{item.emoji}</Text>
              <View style={styles.cityInfo}>
                <Text style={[styles.cityName, disabled && styles.cityNameDimmed]}>
                  {item.name}
                </Text>
                <Text style={styles.cityState}>{item.state}</Text>
              </View>
              {item.comingSoon ? (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Soon</Text>
                </View>
              ) : isSelected ? (
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={COLORS.border.strong} />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

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
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  headerTitle: { fontFamily: FONTS.playfair, fontSize: 22, color: COLORS.cream },

  subtitle: {
    fontFamily: FONTS.dmRegular,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },

  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },
  separator: { height: 1, backgroundColor: COLORS.border.subtle, marginVertical: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  rowDisabled: { opacity: 0.45 },

  cityEmoji: { fontSize: 30, width: 40, textAlign: 'center' },
  cityInfo: { flex: 1 },
  cityName: {
    fontFamily: FONTS.dmMedium,
    fontSize: 17,
    color: COLORS.cream,
    marginBottom: 2,
  },
  cityNameDimmed: { color: COLORS.muted },
  cityState: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted },

  comingSoonBadge: {
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  comingSoonText: { fontFamily: FONTS.dmMedium, fontSize: 11, color: COLORS.muted },

  checkCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.orange,
    alignItems: 'center', justifyContent: 'center',
  },
});
