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

interface Deal {
  id: string;
  title: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed' | 'bogo' | 'free_item' | 'other';
  discount_value: number | null;
  min_purchase: number | null;
  valid_days: number[] | null;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
}

const DISCOUNT_TYPES = [
  { key: 'percentage', label: '% Off' },
  { key: 'fixed', label: '$ Off' },
  { key: 'bogo', label: 'BOGO' },
  { key: 'free_item', label: 'Free Item' },
  { key: 'other', label: 'Other' },
] as const;

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const hour12 = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function parseTimeInput(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return null;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = match[3];
  if (m > 59) return null;
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  if (h > 23) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function discountLabel(deal: Deal): string {
  if (deal.discount_type === 'percentage' && deal.discount_value != null)
    return `${deal.discount_value}% off`;
  if (deal.discount_type === 'fixed' && deal.discount_value != null)
    return `$${deal.discount_value.toFixed(2)} off`;
  if (deal.discount_type === 'bogo') return 'Buy one get one';
  if (deal.discount_type === 'free_item') return 'Free item';
  return 'Special deal';
}

function validDaysLabel(days: number[] | null): string {
  if (!days || days.length === 0) return 'Every day';
  if (days.length === 7) return 'Every day';
  return days.map((d) => DAYS_SHORT[d]).join(', ');
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="pricetag-outline" size={32} color={COLORS.muted} />
      </View>
      <Text style={styles.emptyTitle}>No Special Deals</Text>
      <Text style={styles.emptyText}>
        Add deals like BOGO drinks, percentage discounts, or free items to attract more customers.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onAdd}>
        <Text style={styles.emptyBtnText}>Add First Deal</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Deal Card ────────────────────────────────────────────────────────────────

function DealCard({
  deal,
  onToggle,
  onEdit,
  onDelete,
}: {
  deal: Deal;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={card.container}>
      <View style={card.top}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={card.title}>{deal.title}</Text>
          <Text style={card.discount}>{discountLabel(deal)}</Text>
          {deal.description ? (
            <Text style={card.desc} numberOfLines={2}>{deal.description}</Text>
          ) : null}
        </View>
        <Switch
          value={deal.is_active}
          onValueChange={onToggle}
          trackColor={{ false: COLORS.border.subtle, true: COLORS.orange + '60' }}
          thumbColor={deal.is_active ? COLORS.orange : COLORS.muted}
          ios_backgroundColor={COLORS.border.subtle}
        />
      </View>

      <View style={card.meta}>
        <View style={card.metaItem}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.muted} />
          <Text style={card.metaText}>{validDaysLabel(deal.valid_days)}</Text>
        </View>
        {deal.start_time && deal.end_time ? (
          <View style={card.metaItem}>
            <Ionicons name="time-outline" size={12} color={COLORS.muted} />
            <Text style={card.metaText}>
              {formatTime(deal.start_time)} – {formatTime(deal.end_time)}
            </Text>
          </View>
        ) : null}
        {deal.min_purchase != null ? (
          <View style={card.metaItem}>
            <Ionicons name="cart-outline" size={12} color={COLORS.muted} />
            <Text style={card.metaText}>Min ${deal.min_purchase.toFixed(2)}</Text>
          </View>
        ) : null}
      </View>

      <View style={card.actions}>
        {!deal.is_active && <Text style={card.inactiveTag}>Inactive</Text>}
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={card.actionBtn} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={14} color={COLORS.cream} />
          <Text style={card.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[card.actionBtn, card.deleteBtn]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color={COLORS.status.error} />
          <Text style={[card.actionText, { color: COLORS.status.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

interface DealForm {
  title: string;
  description: string;
  discount_type: Deal['discount_type'];
  discount_value: string;
  min_purchase: string;
  valid_days: number[];
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const BLANK: DealForm = {
  title: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_purchase: '',
  valid_days: [],
  start_time: '',
  end_time: '',
  is_active: true,
};

function dealToForm(d: Deal): DealForm {
  return {
    title: d.title,
    description: d.description ?? '',
    discount_type: d.discount_type,
    discount_value: d.discount_value != null ? String(d.discount_value) : '',
    min_purchase: d.min_purchase != null ? String(d.min_purchase) : '',
    valid_days: d.valid_days ?? [],
    start_time: d.start_time ? formatTime(d.start_time) : '',
    end_time: d.end_time ? formatTime(d.end_time) : '',
    is_active: d.is_active,
  };
}

function DealModal({
  visible, restaurantId, editing, onClose, onSaved,
}: {
  visible: boolean;
  restaurantId: string;
  editing: Deal | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<DealForm>(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setForm(editing ? dealToForm(editing) : BLANK);
  }, [visible, editing]);

  const set = (k: keyof DealForm, v: DealForm[keyof DealForm]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const toggleDay = (d: number) =>
    setForm((prev) => ({
      ...prev,
      valid_days: prev.valid_days.includes(d)
        ? prev.valid_days.filter((x) => x !== d)
        : [...prev.valid_days, d],
    }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Required', 'Please enter a deal title.');
      return;
    }

    const needsValue = form.discount_type === 'percentage' || form.discount_type === 'fixed';
    const discountVal = form.discount_value ? parseFloat(form.discount_value) : null;
    if (needsValue && (discountVal == null || isNaN(discountVal) || discountVal <= 0)) {
      Alert.alert('Invalid', 'Enter a valid discount amount.');
      return;
    }

    let startParsed: string | null = null;
    let endParsed: string | null = null;
    if (form.start_time.trim()) {
      startParsed = parseTimeInput(form.start_time);
      if (!startParsed) { Alert.alert('Invalid', 'Start time format: 4:00 PM'); return; }
    }
    if (form.end_time.trim()) {
      endParsed = parseTimeInput(form.end_time);
      if (!endParsed) { Alert.alert('Invalid', 'End time format: 7:00 PM'); return; }
    }

    setSaving(true);
    const payload = {
      restaurant_id: restaurantId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: discountVal,
      min_purchase: form.min_purchase ? parseFloat(form.min_purchase) || null : null,
      valid_days: form.valid_days.length > 0 ? form.valid_days : null,
      start_time: startParsed,
      end_time: endParsed,
      is_active: form.is_active,
    };

    const { error } = editing
      ? await supabase.from('deals').update(payload).eq('id', editing.id)
      : await supabase.from('deals').insert(payload);

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaved();
    onClose();
  };

  const showValue = form.discount_type === 'percentage' || form.discount_type === 'fixed';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modal.container} edges={['top', 'bottom']}>
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={modal.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={modal.title}>{editing ? 'Edit Deal' : 'Add Deal'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={COLORS.orange} />
              : <Text style={modal.save}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modal.body} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <Text style={modal.label}>Deal Title</Text>
          <TextInput
            style={modal.input}
            value={form.title}
            onChangeText={(v) => set('title', v)}
            placeholder="e.g. Half-Price Appetizers"
            placeholderTextColor={COLORS.faded}
            keyboardAppearance="dark"
          />

          {/* Description */}
          <Text style={modal.label}>Description <Text style={modal.optional}>(optional)</Text></Text>
          <TextInput
            style={[modal.input, modal.multiline]}
            value={form.description}
            onChangeText={(v) => set('description', v)}
            placeholder="Tell customers more about this deal..."
            placeholderTextColor={COLORS.faded}
            multiline
            numberOfLines={3}
            keyboardAppearance="dark"
          />

          {/* Discount Type */}
          <Text style={modal.label}>Discount Type</Text>
          <View style={modal.chips}>
            {DISCOUNT_TYPES.map((dt) => (
              <TouchableOpacity
                key={dt.key}
                style={[modal.chip, form.discount_type === dt.key && modal.chipActive]}
                onPress={() => set('discount_type', dt.key)}
              >
                <Text style={[modal.chipText, form.discount_type === dt.key && modal.chipTextActive]}>
                  {dt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Discount Value */}
          {showValue && (
            <>
              <Text style={modal.label}>
                {form.discount_type === 'percentage' ? 'Percentage Off (%)' : 'Dollar Amount Off ($)'}
              </Text>
              <TextInput
                style={modal.input}
                value={form.discount_value}
                onChangeText={(v) => set('discount_value', v)}
                placeholder={form.discount_type === 'percentage' ? 'e.g. 50' : 'e.g. 5.00'}
                placeholderTextColor={COLORS.faded}
                keyboardType="decimal-pad"
                keyboardAppearance="dark"
              />
            </>
          )}

          {/* Valid Days */}
          <Text style={modal.label}>Valid Days <Text style={modal.optional}>(leave empty = every day)</Text></Text>
          <View style={modal.chips}>
            {DAYS_SHORT.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[modal.chip, form.valid_days.includes(i) && modal.chipActive]}
                onPress={() => toggleDay(i)}
              >
                <Text style={[modal.chipText, form.valid_days.includes(i) && modal.chipTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Time Range */}
          <Text style={modal.label}>Start Time <Text style={modal.optional}>(optional)</Text></Text>
          <TextInput
            style={modal.input}
            value={form.start_time}
            onChangeText={(v) => set('start_time', v)}
            placeholder="e.g. 4:00 PM"
            placeholderTextColor={COLORS.faded}
            keyboardAppearance="dark"
          />

          <Text style={modal.label}>End Time <Text style={modal.optional}>(optional)</Text></Text>
          <TextInput
            style={modal.input}
            value={form.end_time}
            onChangeText={(v) => set('end_time', v)}
            placeholder="e.g. 7:00 PM"
            placeholderTextColor={COLORS.faded}
            keyboardAppearance="dark"
          />

          {/* Min Purchase */}
          <Text style={modal.label}>Minimum Purchase <Text style={modal.optional}>(optional)</Text></Text>
          <TextInput
            style={modal.input}
            value={form.min_purchase}
            onChangeText={(v) => set('min_purchase', v)}
            placeholder="e.g. 10.00"
            placeholderTextColor={COLORS.faded}
            keyboardType="decimal-pad"
            keyboardAppearance="dark"
          />

          {/* Active Toggle */}
          <View style={modal.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={modal.label} >Active</Text>
              <Text style={modal.toggleSub}>Show this deal to customers</Text>
            </View>
            <Switch
              value={form.is_active}
              onValueChange={(v) => set('is_active', v)}
              trackColor={{ false: COLORS.border.subtle, true: COLORS.orange + '60' }}
              thumbColor={form.is_active ? COLORS.orange : COLORS.muted}
              ios_backgroundColor={COLORS.border.subtle}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DealsScreen() {
  const { ownedRestaurant } = useAuthStore();
  const restaurantId = ownedRestaurant?.id ?? '';
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);

  const fetchDeals = useCallback(async () => {
    const { data } = await supabase
      .from('deals')
      .select('id, title, description, discount_type, discount_value, min_purchase, valid_days, start_time, end_time, is_active')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    setDeals((data as Deal[]) ?? []);
  }, [restaurantId]);

  useEffect(() => {
    fetchDeals().finally(() => setLoading(false));
  }, [fetchDeals]);

  const openAdd = () => { setEditing(null); setShowModal(true); };
  const openEdit = (d: Deal) => { setEditing(d); setShowModal(true); };

  const toggleActive = async (deal: Deal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDeals((prev) => prev.map((d) => d.id === deal.id ? { ...d, is_active: !d.is_active } : d));
    await supabase.from('deals').update({ is_active: !deal.is_active }).eq('id', deal.id);
  };

  const deleteDeal = (deal: Deal) => {
    Alert.alert('Delete Deal', `Remove "${deal.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setDeals((prev) => prev.filter((d) => d.id !== deal.id));
          await supabase.from('deals').delete().eq('id', deal.id);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Special Deals</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color={COLORS.orange} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={COLORS.orange} /></View>
      ) : deals.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {deals.map((d) => (
            <DealCard
              key={d.id}
              deal={d}
              onToggle={() => toggleActive(d)}
              onEdit={() => openEdit(d)}
              onDelete={() => deleteDeal(d)}
            />
          ))}
          <TouchableOpacity style={styles.addRowBtn} onPress={openAdd}>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.orange} />
            <Text style={styles.addRowText}>Add Deal</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <DealModal
        visible={showModal}
        restaurantId={restaurantId}
        editing={editing}
        onClose={() => setShowModal(false)}
        onSaved={fetchDeals}
      />
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
  addBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.orange10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.default,
  },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 60 },
  addRowBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    justifyContent: 'center', paddingVertical: SPACING.lg,
  },
  addRowText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.orange },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: SPACING.xl, gap: SPACING.md,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontFamily: FONTS.playfair, fontSize: 20, color: COLORS.cream },
  emptyText: {
    fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted,
    textAlign: 'center', lineHeight: 21,
  },
  emptyBtn: {
    marginTop: SPACING.sm, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    backgroundColor: COLORS.orange, borderRadius: RADIUS.full,
  },
  emptyBtnText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: '#fff' },
});

const card = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    padding: SPACING.md, gap: SPACING.sm,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  title: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.cream },
  discount: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.orange },
  desc: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },
  actions: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border.subtle, paddingTop: SPACING.sm,
  },
  inactiveTag: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  deleteBtn: { borderColor: COLORS.status.error + '40' },
  actionText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.cream },
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
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1.5, borderColor: COLORS.border.default,
  },
  chipActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  chipText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.muted },
  chipTextActive: { color: '#fff' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: SPACING.md, paddingTop: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border.subtle,
  },
  toggleSub: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
