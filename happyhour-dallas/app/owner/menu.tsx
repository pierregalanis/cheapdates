import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert, Switch,
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

interface MenuItem {
  id: string;
  category: string;
  name: string;
  description: string | null;
  regular_price: number | null;
  happy_hour_price: number | null;
  is_featured: boolean;
  is_available: boolean;
}

const CATEGORIES = ['Drinks', 'Beer & Wine', 'Food', 'Appetizers', 'Desserts', 'Other'];

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function ItemModal({
  visible, restaurantId, item, onClose, onSaved,
}: {
  visible: boolean;
  restaurantId: string;
  item: MenuItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState('Drinks');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [regularPrice, setRegularPrice] = useState('');
  const [hhPrice, setHhPrice] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setCategory(item.category);
      setName(item.name);
      setDescription(item.description ?? '');
      setRegularPrice(item.regular_price != null ? String(item.regular_price) : '');
      setHhPrice(item.happy_hour_price != null ? String(item.happy_hour_price) : '');
      setIsFeatured(item.is_featured);
    } else {
      setCategory('Drinks');
      setName('');
      setDescription('');
      setRegularPrice('');
      setHhPrice('');
      setIsFeatured(false);
    }
  }, [item, visible]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Item name is required.'); return; }
    setSaving(true);
    const payload = {
      restaurant_id: restaurantId,
      category,
      name: name.trim(),
      description: description.trim() || null,
      regular_price: regularPrice ? parseFloat(regularPrice) : null,
      happy_hour_price: hhPrice ? parseFloat(hhPrice) : null,
      is_featured: isFeatured,
      is_available: true,
    };
    const { error } = item
      ? await supabase.from('menu_items').update(payload).eq('id', item.id)
      : await supabase.from('menu_items').insert(payload);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modal.container} edges={['top', 'bottom']}>
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={modal.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={modal.title}>{item ? 'Edit Item' : 'Add Item'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={COLORS.orange} /> : <Text style={modal.save}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modal.body} keyboardShouldPersistTaps="handled">
          <Text style={modal.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[modal.chip, category === c && modal.chipActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[modal.chipText, category === c && modal.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={modal.label}>Item Name</Text>
          <TextInput
            style={modal.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. House Margarita"
            placeholderTextColor={COLORS.faded}
            keyboardAppearance="dark"
          />

          <Text style={modal.label}>Description <Text style={modal.optional}>(optional)</Text></Text>
          <TextInput
            style={[modal.input, { minHeight: 72, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Short description..."
            placeholderTextColor={COLORS.faded}
            multiline
            keyboardAppearance="dark"
          />

          <View style={modal.priceRow}>
            <View style={{ flex: 1 }}>
              <Text style={modal.label}>Regular Price</Text>
              <TextInput
                style={modal.input}
                value={regularPrice}
                onChangeText={setRegularPrice}
                placeholder="12.00"
                placeholderTextColor={COLORS.faded}
                keyboardType="decimal-pad"
                keyboardAppearance="dark"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modal.label}>Happy Hour Price</Text>
              <TextInput
                style={modal.input}
                value={hhPrice}
                onChangeText={setHhPrice}
                placeholder="7.00"
                placeholderTextColor={COLORS.faded}
                keyboardType="decimal-pad"
                keyboardAppearance="dark"
              />
            </View>
          </View>

          <View style={modal.toggleRow}>
            <View>
              <Text style={modal.label}>Featured Item</Text>
              <Text style={modal.toggleSub}>Shows first on the menu</Text>
            </View>
            <Switch
              value={isFeatured}
              onValueChange={setIsFeatured}
              trackColor={{ false: COLORS.overlay.inputBg, true: 'rgba(255,107,26,0.4)' }}
              thumbColor={isFeatured ? COLORS.orange : COLORS.muted}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MenuScreen() {
  const { ownedRestaurant } = useAuthStore();
  const restaurantId = ownedRestaurant?.id ?? '';
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('id, category, name, description, regular_price, happy_hour_price, is_featured, is_available')
      .eq('restaurant_id', restaurantId)
      .order('category')
      .order('is_featured', { ascending: false })
      .order('name');
    setItems((data as MenuItem[]) ?? []);
  }, [restaurantId]);

  useEffect(() => {
    fetchItems().finally(() => setLoading(false));
  }, [fetchItems]);

  const toggleAvailable = async (item: MenuItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
  };

  const deleteItem = (item: MenuItem) => {
    Alert.alert('Delete', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          await supabase.from('menu_items').delete().eq('id', item.id);
        },
      },
    ]);
  };

  const openAdd = () => { setEditingItem(null); setShowModal(true); };
  const openEdit = (item: MenuItem) => { setEditingItem(item); setShowModal(true); };

  const grouped = CATEGORIES.reduce<Record<string, MenuItem[]>>((acc, cat) => {
    const catItems = items.filter((i) => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {});
  const otherItems = items.filter((i) => !CATEGORIES.includes(i.category));
  if (otherItems.length) grouped['Other'] = [...(grouped['Other'] ?? []), ...otherItems];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu Items</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color={COLORS.orange} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={COLORS.orange} /></View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="restaurant-outline" size={48} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>No menu items yet</Text>
          <Text style={styles.emptySub}>Add your happy hour drinks and food</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openAdd}>
            <Text style={styles.emptyBtnText}>Add First Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {Object.entries(grouped).map(([cat, catItems]) => (
            <View key={cat} style={styles.section}>
              <Text style={styles.catLabel}>{cat}</Text>
              <View style={styles.card}>
                {catItems.map((item, i) => (
                  <View key={item.id} style={[styles.itemRow, i > 0 && styles.itemBorder]}>
                    <View style={styles.itemLeft}>
                      {item.is_featured && (
                        <View style={styles.featuredBadge}>
                          <Text style={styles.featuredText}>★ Featured</Text>
                        </View>
                      )}
                      <Text style={[styles.itemName, !item.is_available && { color: COLORS.muted }]}>
                        {item.name}
                      </Text>
                      <View style={styles.priceRow}>
                        {item.happy_hour_price != null && (
                          <Text style={styles.hhPrice}>${item.happy_hour_price.toFixed(2)} HH</Text>
                        )}
                        {item.regular_price != null && (
                          <Text style={styles.regPrice}>${item.regular_price.toFixed(2)} reg</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.itemActions}>
                      <Switch
                        value={item.is_available}
                        onValueChange={() => toggleAvailable(item)}
                        trackColor={{ false: COLORS.overlay.inputBg, true: 'rgba(52,199,89,0.35)' }}
                        thumbColor={item.is_available ? COLORS.status.success : COLORS.muted}
                        ios_backgroundColor={COLORS.overlay.inputBg}
                      />
                      <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                        <Ionicons name="create-outline" size={16} color={COLORS.orange} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteItem(item)} style={styles.actionBtn}>
                        <Ionicons name="trash-outline" size={16} color={COLORS.status.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addRowBtn} onPress={openAdd}>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.orange} />
            <Text style={styles.addRowText}>Add Menu Item</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <ItemModal
        visible={showModal}
        restaurantId={restaurantId}
        item={editingItem}
        onClose={() => setShowModal(false)}
        onSaved={fetchItems}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
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
  addBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.orange10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.default,
  },
  scroll: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 60 },
  section: { gap: SPACING.xs },
  catLabel: {
    fontFamily: FONTS.dmMedium, fontSize: 11,
    color: COLORS.muted, letterSpacing: 0.8, textTransform: 'uppercase',
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border.subtle, overflow: 'hidden',
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  itemBorder: { borderTopWidth: 1, borderTopColor: COLORS.border.subtle },
  itemLeft: { flex: 1, gap: 3 },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(232,168,48,0.15)',
    borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(232,168,48,0.3)',
    marginBottom: 2,
  },
  featuredText: { fontFamily: FONTS.dmMedium, fontSize: 10, color: COLORS.gold },
  itemName: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.cream },
  priceRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  hhPrice: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.orange },
  regPrice: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, textDecorationLine: 'line-through' },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtn: { padding: 6 },
  emptyTitle: { fontFamily: FONTS.playfair, fontSize: 20, color: COLORS.cream },
  emptySub: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted },
  emptyBtn: {
    backgroundColor: COLORS.orange, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.sm,
  },
  emptyBtnText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: '#fff' },
  addRowBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    justifyContent: 'center', paddingVertical: SPACING.lg,
  },
  addRowText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.orange },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border.subtle,
  },
  title: { fontFamily: FONTS.playfair, fontSize: 18, color: COLORS.cream },
  cancel: { fontFamily: FONTS.dmRegular, fontSize: 16, color: COLORS.muted },
  save: { fontFamily: FONTS.dmMedium, fontSize: 16, color: COLORS.orange },
  body: { padding: SPACING.lg, gap: SPACING.xs, paddingBottom: 60 },
  label: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.cream, marginTop: SPACING.md },
  optional: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },
  input: {
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border.default,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.cream,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1.5, borderColor: COLORS.border.default,
  },
  chipActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  chipText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.muted },
  chipTextActive: { color: '#fff' },
  priceRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: SPACING.lg, paddingTop: SPACING.lg,
    borderTopWidth: 1, borderTopColor: COLORS.border.subtle,
  },
  toggleSub: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
