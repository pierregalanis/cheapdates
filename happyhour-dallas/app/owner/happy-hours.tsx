import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert,
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

interface HappyHour {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string | null;
  is_active: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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

// ─── Add Modal ────────────────────────────────────────────────────────────────

function AddModal({
  visible, restaurantId, onClose, onSaved,
}: {
  visible: boolean; restaurantId: string; onClose: () => void; onSaved: () => void;
}) {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('4:00 PM');
  const [endTime, setEndTime] = useState('7:00 PM');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSelectedDays([]);
    setStartTime('4:00 PM');
    setEndTime('7:00 PM');
    setLabel('');
  };

  const toggleDay = (d: number) => {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      Alert.alert('Select Days', 'Please select at least one day.');
      return;
    }
    const start = parseTimeInput(startTime);
    const end = parseTimeInput(endTime);
    if (!start) { Alert.alert('Invalid Time', 'Start time format: 4:00 PM'); return; }
    if (!end)   { Alert.alert('Invalid Time', 'End time format: 7:00 PM'); return; }

    setSaving(true);
    const rows = selectedDays.map((d) => ({
      restaurant_id: restaurantId,
      day_of_week: d,
      start_time: start,
      end_time: end,
      label: label.trim() || null,
      is_active: true,
    }));
    const { error } = await supabase.from('happy_hours').insert(rows);
    setSaving(false);

    if (error) { Alert.alert('Error', error.message); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reset();
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modal.container} edges={['top', 'bottom']}>
        <View style={modal.header}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text style={modal.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={modal.title}>Add Happy Hour</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={COLORS.orange} />
              : <Text style={modal.save}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modal.body}>
          {/* Days */}
          <Text style={modal.label}>Days</Text>
          <View style={modal.daysRow}>
            {DAYS_SHORT.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[modal.dayChip, selectedDays.includes(i) && modal.dayChipActive]}
                onPress={() => toggleDay(i)}
              >
                <Text style={[modal.dayChipText, selectedDays.includes(i) && modal.dayChipTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Times */}
          <Text style={modal.label}>Start Time</Text>
          <TextInput
            style={modal.input}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="e.g. 4:00 PM"
            placeholderTextColor={COLORS.faded}
            keyboardAppearance="dark"
          />

          <Text style={modal.label}>End Time</Text>
          <TextInput
            style={modal.input}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="e.g. 7:00 PM"
            placeholderTextColor={COLORS.faded}
            keyboardAppearance="dark"
          />

          {/* Label */}
          <Text style={modal.label}>Label <Text style={modal.optional}>(optional)</Text></Text>
          <TextInput
            style={modal.input}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Weekday Special"
            placeholderTextColor={COLORS.faded}
            keyboardAppearance="dark"
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HappyHoursScreen() {
  const { ownedRestaurant } = useAuthStore();
  const restaurantId = ownedRestaurant?.id ?? '';
  const [hours, setHours] = useState<HappyHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchHours = useCallback(async () => {
    const { data } = await supabase
      .from('happy_hours')
      .select('id, day_of_week, start_time, end_time, label, is_active')
      .eq('restaurant_id', restaurantId)
      .order('day_of_week')
      .order('start_time');
    setHours((data as HappyHour[]) ?? []);
  }, [restaurantId]);

  useEffect(() => {
    fetchHours().finally(() => setLoading(false));
  }, [fetchHours]);

  const toggleActive = async (hh: HappyHour) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHours((prev) => prev.map((h) => h.id === hh.id ? { ...h, is_active: !h.is_active } : h));
    await supabase.from('happy_hours').update({ is_active: !hh.is_active }).eq('id', hh.id);
  };

  const deleteHour = (hh: HappyHour) => {
    Alert.alert('Delete', `Remove ${DAYS[hh.day_of_week]} ${formatTime(hh.start_time)}–${formatTime(hh.end_time)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setHours((prev) => prev.filter((h) => h.id !== hh.id));
          await supabase.from('happy_hours').delete().eq('id', hh.id);
        },
      },
    ]);
  };

  const byDay = DAYS.map((_, i) => hours.filter((h) => h.day_of_week === i));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Happy Hours</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={22} color={COLORS.orange} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={COLORS.orange} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {byDay.map((dayHours, dayIndex) => (
            <View key={dayIndex} style={styles.daySection}>
              <Text style={styles.dayLabel}>{DAYS[dayIndex]}</Text>
              {dayHours.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={styles.emptyDayText}>No happy hour</Text>
                </View>
              ) : (
                <View style={styles.card}>
                  {dayHours.map((hh, i) => (
                    <View key={hh.id} style={[styles.hhRow, i > 0 && styles.hhRowBorder]}>
                      <TouchableOpacity onPress={() => toggleActive(hh)} style={styles.activeDotBtn}>
                        <View style={[
                          styles.activeDot,
                          { backgroundColor: hh.is_active ? COLORS.status.success : COLORS.muted },
                        ]} />
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        {hh.label && <Text style={styles.hhLabel}>{hh.label}</Text>}
                        <Text style={[styles.hhTime, !hh.is_active && { color: COLORS.muted }]}>
                          {formatTime(hh.start_time)} – {formatTime(hh.end_time)}
                        </Text>
                        {!hh.is_active && <Text style={styles.inactiveTag}>Inactive</Text>}
                      </View>
                      <TouchableOpacity onPress={() => deleteHour(hh)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={16} color={COLORS.status.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addRowBtn} onPress={() => setShowAdd(true)}>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.orange} />
            <Text style={styles.addRowText}>Add Happy Hour</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <AddModal
        visible={showAdd}
        restaurantId={restaurantId}
        onClose={() => setShowAdd(false)}
        onSaved={fetchHours}
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
  daySection: { gap: SPACING.xs },
  dayLabel: {
    fontFamily: FONTS.dmMedium, fontSize: 11,
    color: COLORS.muted, letterSpacing: 0.8, textTransform: 'uppercase',
  },
  emptyDay: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    padding: SPACING.md,
  },
  emptyDayText: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border.subtle, overflow: 'hidden',
  },
  hhRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md },
  hhRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border.subtle },
  activeDotBtn: { padding: 4 },
  activeDot: { width: 10, height: 10, borderRadius: 5 },
  hhLabel: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted, marginBottom: 2 },
  hhTime: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.cream },
  inactiveTag: { fontFamily: FONTS.dmRegular, fontSize: 10, color: COLORS.muted, marginTop: 2 },
  deleteBtn: { padding: 6 },
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
  body: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 60 },
  label: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.cream, marginTop: SPACING.md },
  optional: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },
  input: {
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border.default,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.cream,
  },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: 4 },
  dayChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1.5, borderColor: COLORS.border.default,
  },
  dayChipActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  dayChipText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.muted },
  dayChipTextActive: { color: '#fff' },
});
