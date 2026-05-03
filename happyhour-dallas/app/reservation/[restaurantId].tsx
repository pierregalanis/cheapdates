import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Analytics } from '@/lib/analytics';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const TIME_SLOTS = [
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM',
];

const DAYS = ['Today', 'Tomorrow', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MOCK_RESTAURANTS: Record<string, { name: string; emoji: string; neighborhood: string }> = {
  '1': { name: 'Bottled Blonde', emoji: '🍸', neighborhood: 'Uptown' },
  '2': { name: 'Happiest Hour', emoji: '🍺', neighborhood: 'Uptown' },
  '3': { name: 'Off the Record', emoji: '🎵', neighborhood: 'Deep Ellum' },
  default: { name: 'The Rustic', emoji: '🌿', neighborhood: 'Design District' },
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ step }: { step: Step }) {
  return (
    <View style={styles.stepDots}>
      {([1, 2, 3] as Step[]).map((s) => (
        <View key={s} style={[styles.stepDot, s === step && styles.stepDotActive, s < step && styles.stepDotDone]}>
          {s < step ? (
            <Ionicons name="checkmark" size={10} color="#fff" />
          ) : (
            <Text style={[styles.stepDotText, s === step && { color: '#fff' }]}>{s}</Text>
          )}
        </View>
      ))}
      <View style={[styles.stepConnector, { backgroundColor: step >= 2 ? COLORS.orange : COLORS.border.subtle }]} />
      <View style={[styles.stepConnector, { backgroundColor: step >= 3 ? COLORS.orange : COLORS.border.subtle }, { left: 'auto', right: 0 }]} />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ReservationScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const restaurant = MOCK_RESTAURANTS[restaurantId] ?? MOCK_RESTAURANTS['default'];

  const [step, setStep] = useState<Step>(1);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedTime, setSelectedTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);

  const canNext1 = selectedTime !== '';
  const canNext2 = true;
  const canSubmit = name.trim() !== '' && phone.trim() !== '';

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => Math.min(s + 1, 3) as Step);
  };

  const back = () => {
    if (step === 1) router.back();
    else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep((s) => Math.max(s - 1, 1) as Step);
    }
  };

  const submit = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setConfirmed(true);
    Analytics.reservationComplete(restaurantId, partySize);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (confirmed) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.successScreen}>
          <View style={styles.successIconRing}>
            <Text style={styles.successEmoji}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>You're on the list!</Text>
          <Text style={styles.successSub}>
            {restaurant.name} · {DAYS[selectedDay]} at {selectedTime}{'\n'}
            Party of {partySize}
          </Text>
          <View style={styles.confirmCard}>
            <View style={styles.confirmRow}>
              <Ionicons name="person-outline" size={15} color={COLORS.muted} />
              <Text style={styles.confirmText}>{name}</Text>
            </View>
            <View style={styles.confirmSep} />
            <View style={styles.confirmRow}>
              <Ionicons name="call-outline" size={15} color={COLORS.muted} />
              <Text style={styles.confirmText}>{phone}</Text>
            </View>
            <View style={styles.confirmSep} />
            <View style={styles.confirmRow}>
              <Ionicons name="restaurant-outline" size={15} color={COLORS.muted} />
              <Text style={styles.confirmText}>{restaurant.name} · {restaurant.neighborhood}</Text>
            </View>
          </View>
          <Text style={styles.confirmNote}>
            A confirmation will be sent to your number. You can cancel up to 1 hour before.
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Back to Restaurant</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={back}>
            <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerRestaurant}>{restaurant.emoji} {restaurant.name}</Text>
            <Text style={styles.headerLabel}>Reserve a Table</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <StepDots step={step} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Step 1: Date & Time ── */}
          {step === 1 && (
            <View>
              <Text style={styles.stepHeading}>When are you going?</Text>

              <Text style={styles.fieldLabel}>Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
                {DAYS.map((day, i) => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, selectedDay === i && styles.dayChipActive]}
                    onPress={() => { setSelectedDay(i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Text style={[styles.dayChipText, selectedDay === i && styles.dayChipTextActive]}>{day}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Time</Text>
              <View style={styles.timeGrid}>
                {TIME_SLOTS.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeChip, selectedTime === time && styles.timeChipActive]}
                    onPress={() => { setSelectedTime(time); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Text style={[styles.timeChipText, selectedTime === time && styles.timeChipTextActive]}>{time}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Step 2: Party size ── */}
          {step === 2 && (
            <View>
              <Text style={styles.stepHeading}>How many guests?</Text>
              <Text style={styles.stepSub}>{DAYS[selectedDay]} · {selectedTime}</Text>

              <View style={styles.partySizeGrid}>
                {PARTY_SIZES.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.sizeBtn, partySize === n && styles.sizeBtnActive]}
                    onPress={() => { setPartySize(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Text style={[styles.sizeBtnNumber, partySize === n && styles.sizeBtnNumberActive]}>{n}</Text>
                    <Text style={[styles.sizeBtnLabel, partySize === n && styles.sizeBtnLabelActive]}>
                      {n === 1 ? 'guest' : 'guests'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.partySummaryCard}>
                <Ionicons name="people-outline" size={18} color={COLORS.orange} />
                <Text style={styles.partySummaryText}>
                  Table for <Text style={styles.partySummaryHighlight}>{partySize}</Text> on{' '}
                  <Text style={styles.partySummaryHighlight}>{DAYS[selectedDay]}</Text> at{' '}
                  <Text style={styles.partySummaryHighlight}>{selectedTime}</Text>
                </Text>
              </View>
            </View>
          )}

          {/* ── Step 3: Contact info ── */}
          {step === 3 && (
            <View>
              <Text style={styles.stepHeading}>Almost there!</Text>
              <Text style={styles.stepSub}>So the restaurant can reach you</Text>

              <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
                <Ionicons name="person-outline" size={17} color={nameFocused ? COLORS.orange : COLORS.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={COLORS.faded}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  autoCapitalize="words"
                  keyboardAppearance="dark"
                />
              </View>

              <View style={[styles.inputWrap, phoneFocused && styles.inputWrapFocused]}>
                <Ionicons name="call-outline" size={17} color={phoneFocused ? COLORS.orange : COLORS.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  placeholderTextColor={COLORS.faded}
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  keyboardType="phone-pad"
                  keyboardAppearance="dark"
                />
              </View>

              <View style={[styles.inputWrap, styles.inputWrapTall, notesFocused && styles.inputWrapFocused]}>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Special requests (optional)"
                  placeholderTextColor={COLORS.faded}
                  value={notes}
                  onChangeText={setNotes}
                  onFocus={() => setNotesFocused(true)}
                  onBlur={() => setNotesFocused(false)}
                  multiline
                  numberOfLines={3}
                  keyboardAppearance="dark"
                />
              </View>

              <View style={styles.bookingSummaryCard}>
                <Text style={styles.bookingSummaryTitle}>Booking Summary</Text>
                {[
                  { icon: 'restaurant-outline' as const, text: `${restaurant.emoji} ${restaurant.name}` },
                  { icon: 'calendar-outline' as const, text: `${DAYS[selectedDay]} · ${selectedTime}` },
                  { icon: 'people-outline' as const, text: `Party of ${partySize}` },
                ].map((row) => (
                  <View key={row.text} style={styles.bookingSummaryRow}>
                    <Ionicons name={row.icon} size={14} color={COLORS.muted} />
                    <Text style={styles.bookingSummaryText}>{row.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          {step < 3 ? (
            <TouchableOpacity
              style={[styles.nextBtn, !canNext1 && step === 1 && styles.btnDisabled]}
              onPress={next}
              disabled={step === 1 && !canNext1}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextBtn, (!canSubmit || loading) && styles.btnDisabled]}
              onPress={submit}
              disabled={!canSubmit || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>Confirm Reservation</Text>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRestaurant: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.cream },
  headerLabel: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, marginTop: 2 },

  stepDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: 0,
    position: 'relative',
  },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1.5, borderColor: COLORS.border.default,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
    marginHorizontal: 32,
  },
  stepDotActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  stepDotDone: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  stepDotText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.muted },
  stepConnector: {
    position: 'absolute',
    top: '50%',
    left: '18%',
    right: '18%',
    height: 1.5,
    marginTop: -0.75,
  },

  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 120 },

  stepHeading: { fontFamily: FONTS.playfair, fontSize: 26, color: COLORS.cream, marginBottom: SPACING.xs },
  stepSub: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted, marginBottom: SPACING.xl },

  fieldLabel: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: SPACING.sm, marginTop: SPACING.lg },

  dayRow: { gap: SPACING.sm, paddingBottom: SPACING.sm },
  dayChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1.5, borderColor: COLORS.border.default,
  },
  dayChipActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  dayChipText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.muted },
  dayChipTextActive: { color: '#fff' },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  timeChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1.5, borderColor: COLORS.border.default,
    minWidth: '28%',
    alignItems: 'center',
  },
  timeChipActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange, shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  timeChipText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.muted },
  timeChipTextActive: { color: '#fff' },

  partySizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  sizeBtn: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1.5, borderColor: COLORS.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  sizeBtnActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange, shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  sizeBtnNumber: { fontFamily: FONTS.dmMedium, fontSize: 18, color: COLORS.cream },
  sizeBtnNumberActive: { color: '#fff' },
  sizeBtnLabel: { fontFamily: FONTS.dmRegular, fontSize: 9, color: COLORS.muted, marginTop: 1 },
  sizeBtnLabelActive: { color: 'rgba(255,255,255,0.7)' },

  partySummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.overlay.orange10,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border.default,
    marginTop: SPACING.xl,
  },
  partySummaryText: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.cream, flex: 1, lineHeight: 20 },
  partySummaryHighlight: { fontFamily: FONTS.dmMedium, color: COLORS.orange },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border.default,
    height: 54,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  inputWrapTall: { height: 90, alignItems: 'flex-start', paddingVertical: SPACING.md },
  inputWrapFocused: { borderColor: COLORS.orange, backgroundColor: 'rgba(255,107,26,0.06)' },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.cream },
  notesInput: { textAlignVertical: 'top', paddingTop: 0 },

  bookingSummaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    marginTop: SPACING.xl,
  },
  bookingSummaryTitle: { fontFamily: FONTS.playfair, fontSize: 16, color: COLORS.cream, marginBottom: SPACING.md },
  bookingSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  bookingSummaryText: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted },

  ctaWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: 'rgba(26,10,0,0.96)',
    borderTopWidth: 1, borderTopColor: COLORS.border.subtle,
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.full,
    height: 56,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.45 },
  nextBtnText: { fontFamily: FONTS.dmMedium, fontSize: 16, color: '#FFFFFF' },

  // Success state
  successScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  successIconRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.overlay.orange15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.default,
    marginBottom: SPACING.xl,
  },
  successEmoji: { fontSize: 50 },
  successTitle: { fontFamily: FONTS.playfair, fontSize: 30, color: COLORS.cream, marginBottom: SPACING.sm },
  successSub: { fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  confirmCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    width: '100%',
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg },
  confirmSep: { height: 1, backgroundColor: COLORS.border.subtle },
  confirmText: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.cream },
  confirmNote: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, textAlign: 'center', lineHeight: 18, marginBottom: SPACING.xl },
  doneBtn: {
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  doneBtnText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: '#FFFFFF' },
});
