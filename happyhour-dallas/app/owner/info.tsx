import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, TextInput, Alert,
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

interface RestaurantInfo {
  name: string;
  neighborhood: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  description: string | null;
  cuisine_type: string | null;
  price_range: number | null;
  parking_info: string | null;
}

const NEIGHBORHOODS = [
  'Deep Ellum', 'Uptown', 'Lower Greenville', 'Bishop Arts',
  'Knox-Henderson', 'Design District', 'Oak Cliff', 'East Dallas',
  'Lakewood', 'Victory Park', 'Downtown', 'Addison', 'Plano', 'Frisco',
];

const PRICE_OPTIONS = [
  { value: 1, label: '$', sub: 'Under $10' },
  { value: 2, label: '$$', sub: '$10–$25' },
  { value: 3, label: '$$$', sub: '$25–$50' },
  { value: 4, label: '$$$$', sub: '$50+' },
];

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RestaurantInfoScreen() {
  const { ownedRestaurant, fetchOwnedRestaurant, user } = useAuthStore();
  const restaurantId = ownedRestaurant?.id ?? '';

  const [form, setForm] = useState<RestaurantInfo>({
    name: '', neighborhood: null, address: null, phone: null,
    website: null, instagram: null, description: null,
    cuisine_type: null, price_range: null, parking_info: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNeighborhoods, setShowNeighborhoods] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('restaurants')
        .select('name, neighborhood, address, phone, website, instagram, description, cuisine_type, price_range, parking_info')
        .eq('id', restaurantId)
        .single();
      if (data) setForm(data as RestaurantInfo);
      setLoading(false);
    })();
  }, [restaurantId]);

  const set = (k: keyof RestaurantInfo, v: string | number | null) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Restaurant name is required.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('restaurants')
      .update({
        name: form.name.trim(),
        neighborhood: form.neighborhood || null,
        address: form.address?.trim() || null,
        phone: form.phone?.trim() || null,
        website: form.website?.trim() || null,
        instagram: form.instagram?.trim() || null,
        description: form.description?.trim() || null,
        cuisine_type: form.cuisine_type?.trim() || null,
        price_range: form.price_range,
        parking_info: form.parking_info?.trim() || null,
      })
      .eq('id', restaurantId);

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (user) await fetchOwnedRestaurant(user.id);
    Alert.alert('Saved', 'Restaurant info updated successfully.');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.centered}><ActivityIndicator color={COLORS.orange} /></View>
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
        <Text style={styles.headerTitle}>Restaurant Info</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color={COLORS.orange} size="small" />
            : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Basic Info */}
        <SectionHeader title="Basic Info" />
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Restaurant Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => set('name', v)}
              placeholder="Restaurant name"
              placeholderTextColor={COLORS.faded}
              keyboardAppearance="dark"
            />
          </View>
          <View style={[styles.field, styles.fieldBorder]}>
            <Text style={styles.fieldLabel}>Cuisine Type</Text>
            <TextInput
              style={styles.input}
              value={form.cuisine_type ?? ''}
              onChangeText={(v) => set('cuisine_type', v)}
              placeholder="e.g. American, Mexican, Italian..."
              placeholderTextColor={COLORS.faded}
              keyboardAppearance="dark"
            />
          </View>
          <View style={[styles.field, styles.fieldBorder]}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={form.description ?? ''}
              onChangeText={(v) => set('description', v)}
              placeholder="Tell customers about your restaurant..."
              placeholderTextColor={COLORS.faded}
              multiline
              numberOfLines={4}
              keyboardAppearance="dark"
            />
          </View>
        </View>

        {/* Price Range */}
        <SectionHeader title="Price Range" />
        <View style={styles.priceRow}>
          {PRICE_OPTIONS.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[styles.priceOption, form.price_range === p.value && styles.priceOptionActive]}
              onPress={() => set('price_range', form.price_range === p.value ? null : p.value)}
            >
              <Text style={[styles.priceLabel, form.price_range === p.value && styles.priceLabelActive]}>
                {p.label}
              </Text>
              <Text style={[styles.priceSub, form.price_range === p.value && styles.priceSubActive]}>
                {p.sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location */}
        <SectionHeader title="Location" />
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Neighborhood</Text>
            <TouchableOpacity
              style={[styles.input, styles.selectRow]}
              onPress={() => setShowNeighborhoods((p) => !p)}
            >
              <Text style={form.neighborhood ? styles.selectValue : styles.selectPlaceholder}>
                {form.neighborhood ?? 'Select neighborhood...'}
              </Text>
              <Ionicons
                name={showNeighborhoods ? 'chevron-up' : 'chevron-down'}
                size={16} color={COLORS.muted}
              />
            </TouchableOpacity>
            {showNeighborhoods && (
              <View style={styles.dropdown}>
                {NEIGHBORHOODS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.dropdownItem, form.neighborhood === n && styles.dropdownItemActive]}
                    onPress={() => { set('neighborhood', n); setShowNeighborhoods(false); }}
                  >
                    <Text style={[
                      styles.dropdownText,
                      form.neighborhood === n && styles.dropdownTextActive,
                    ]}>
                      {n}
                    </Text>
                    {form.neighborhood === n && (
                      <Ionicons name="checkmark" size={14} color={COLORS.orange} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={[styles.field, styles.fieldBorder]}>
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              style={styles.input}
              value={form.address ?? ''}
              onChangeText={(v) => set('address', v)}
              placeholder="123 Main St, Dallas, TX 75201"
              placeholderTextColor={COLORS.faded}
              keyboardAppearance="dark"
            />
          </View>
          <View style={[styles.field, styles.fieldBorder]}>
            <Text style={styles.fieldLabel}>Parking Info</Text>
            <TextInput
              style={styles.input}
              value={form.parking_info ?? ''}
              onChangeText={(v) => set('parking_info', v)}
              placeholder="e.g. Street parking available, valet on weekends"
              placeholderTextColor={COLORS.faded}
              keyboardAppearance="dark"
            />
          </View>
        </View>

        {/* Contact */}
        <SectionHeader title="Contact & Social" />
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={form.phone ?? ''}
              onChangeText={(v) => set('phone', v)}
              placeholder="(214) 555-0100"
              placeholderTextColor={COLORS.faded}
              keyboardType="phone-pad"
              keyboardAppearance="dark"
            />
          </View>
          <View style={[styles.field, styles.fieldBorder]}>
            <Text style={styles.fieldLabel}>Website</Text>
            <TextInput
              style={styles.input}
              value={form.website ?? ''}
              onChangeText={(v) => set('website', v)}
              placeholder="https://yourrestaurant.com"
              placeholderTextColor={COLORS.faded}
              keyboardType="url"
              autoCapitalize="none"
              keyboardAppearance="dark"
            />
          </View>
          <View style={[styles.field, styles.fieldBorder]}>
            <View style={styles.instagramRow}>
              <Ionicons name="logo-instagram" size={16} color={COLORS.muted} />
              <Text style={styles.fieldLabel}>Instagram</Text>
            </View>
            <TextInput
              style={styles.input}
              value={form.instagram ?? ''}
              onChangeText={(v) => set('instagram', v)}
              placeholder="@yourrestaurant"
              placeholderTextColor={COLORS.faded}
              autoCapitalize="none"
              keyboardAppearance="dark"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveRowBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveRowBtnText}>Save Changes</Text>}
        </TouchableOpacity>

      </ScrollView>
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
  saveBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    backgroundColor: COLORS.overlay.orange10,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border.default,
    minWidth: 60, alignItems: 'center',
  },
  saveBtnText: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.orange },
  scroll: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 80 },

  sectionHeader: {
    fontFamily: FONTS.dmMedium, fontSize: 11,
    color: COLORS.muted, letterSpacing: 0.8, textTransform: 'uppercase',
    marginTop: SPACING.md, marginBottom: SPACING.xs,
  },

  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border.subtle, overflow: 'hidden',
  },
  field: { padding: SPACING.md, gap: SPACING.xs },
  fieldBorder: { borderTopWidth: 1, borderTopColor: COLORS.border.subtle },
  fieldLabel: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.muted },
  input: {
    fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.cream,
    paddingVertical: 4,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },

  instagramRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  selectRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectValue: { fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.cream, flex: 1 },
  selectPlaceholder: { fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.faded, flex: 1 },

  dropdown: {
    marginTop: SPACING.xs,
    borderTopWidth: 1, borderTopColor: COLORS.border.subtle,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xs,
    borderBottomWidth: 1, borderBottomColor: COLORS.border.subtle,
  },
  dropdownItemActive: { backgroundColor: COLORS.overlay.orange10 },
  dropdownText: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.cream },
  dropdownTextActive: { color: COLORS.orange },

  priceRow: { flexDirection: 'row', gap: SPACING.sm },
  priceOption: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.md,
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    gap: 2,
  },
  priceOptionActive: { borderColor: COLORS.orange, backgroundColor: COLORS.overlay.orange10 },
  priceLabel: { fontFamily: FONTS.playfair, fontSize: 18, color: COLORS.cream },
  priceLabelActive: { color: COLORS.orange },
  priceSub: { fontFamily: FONTS.dmRegular, fontSize: 9, color: COLORS.muted, textAlign: 'center' },
  priceSubActive: { color: COLORS.orange },

  saveRowBtn: {
    marginTop: SPACING.lg, backgroundColor: COLORS.orange,
    borderRadius: RADIUS.full, paddingVertical: SPACING.md + 2,
    alignItems: 'center',
  },
  saveRowBtnText: { fontFamily: FONTS.dmMedium, fontSize: 16, color: '#fff' },
});
