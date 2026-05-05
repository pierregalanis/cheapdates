import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
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
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { getRestaurantEmoji } from '@/lib/happyHourHelpers';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

// ─── Data ─────────────────────────────────────────────────────────────────────

const HIGHLIGHT_TAGS = [
  { id: 'deals',    label: '💰 Great Deals' },
  { id: 'vibe',     label: '✨ Amazing Vibe' },
  { id: 'service',  label: '🙌 Great Service' },
  { id: 'drinks',   label: '🍸 Drinks' },
  { id: 'food',     label: '🍔 Food' },
  { id: 'crowd',    label: '🎉 Good Crowd' },
  { id: 'location', label: '📍 Great Location' },
  { id: 'music',    label: '🎵 Music' },
];

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing!'];
const POINTS_PER_REVIEW = 5;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ReviewScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const { user } = useAuthStore();

  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantNeighborhood, setRestaurantNeighborhood] = useState('Dallas');
  const [restaurantEmoji, setRestaurantEmoji] = useState('🍽️');

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const displayRating = hovered || rating;
  const canSubmit = rating > 0 && text.trim().length >= 10;

  useEffect(() => {
    if (!restaurantId) return;
    supabase
      .from('restaurants')
      .select('name, neighborhood, cuisine_type')
      .eq('id', restaurantId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setRestaurantName(data.name);
        setRestaurantNeighborhood(data.neighborhood ?? 'Dallas');
        setRestaurantEmoji(getRestaurantEmoji({ cuisine_type: data.cuisine_type }));
      });
  }, [restaurantId]);

  const toggleTag = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!user) {
      router.push('/(auth)/login' as any);
      return;
    }

    setLoading(true);
    setSubmitError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await supabase.from('reviews').insert({
      restaurant_id: restaurantId,
      user_id: user.id,
      rating,
      body: text,
    });

    if (error) {
      setLoading(false);
      setSubmitError('Could not post review. Please try again.');
      return;
    }

    // Award points for review (fire and forget)
    supabase.rpc('increment_user_points', { p_user_id: user.id, p_points: POINTS_PER_REVIEW });

    setLoading(false);
    setSubmitted(true);
    Analytics.reviewSubmit(restaurantId, rating);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.successScreen}>
          <View style={styles.successRing}>
            <Text style={styles.successEmoji}>⭐</Text>
          </View>
          <Text style={styles.successTitle}>Review posted!</Text>
          <Text style={styles.successSub}>
            Thanks for helping the community find{'\n'}the best happy hours in Dallas
          </Text>
          <View style={styles.successStars}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons key={i} name={i <= rating ? 'star' : 'star-outline'} size={22} color={COLORS.gold} />
            ))}
          </View>
          <View style={styles.pointsBadge}>
            <Ionicons name="ribbon-outline" size={14} color={COLORS.gold} />
            <Text style={styles.pointsBadgeText}>+{POINTS_PER_REVIEW} pts earned</Text>
          </View>
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Write a Review</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Restaurant context */}
          {restaurantName ? (
            <View style={styles.restaurantCard}>
              <Text style={styles.restaurantEmoji}>{restaurantEmoji}</Text>
              <View>
                <Text style={styles.restaurantName}>{restaurantName}</Text>
                <View style={styles.restaurantMeta}>
                  <Ionicons name="location-outline" size={11} color={COLORS.muted} />
                  <Text style={styles.restaurantNeighborhood}>{restaurantNeighborhood}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.restaurantCard, { justifyContent: 'center' }]}>
              <ActivityIndicator size="small" color={COLORS.orange} />
            </View>
          )}

          {/* Star rating */}
          <Text style={styles.fieldLabel}>Your Rating</Text>
          <View style={styles.starSection}>
            <View style={styles.starPickerRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => { setRating(i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                  onPressIn={() => setHovered(i)}
                  onPressOut={() => setHovered(0)}
                  style={styles.starBtn}
                >
                  <Ionicons
                    name={i <= displayRating ? 'star' : 'star-outline'}
                    size={40}
                    color={i <= displayRating ? COLORS.gold : COLORS.border.strong}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {displayRating > 0 && (
              <Text style={styles.starLabel}>{STAR_LABELS[displayRating]}</Text>
            )}
          </View>

          {/* Highlight tags */}
          <Text style={styles.fieldLabel}>What stood out?</Text>
          <View style={styles.tagsGrid}>
            {HIGHLIGHT_TAGS.map((tag) => {
              const active = selectedTags.includes(tag.id);
              return (
                <TouchableOpacity
                  key={tag.id}
                  style={[styles.tagChip, active && styles.tagChipActive]}
                  onPress={() => toggleTag(tag.id)}
                >
                  <Text style={[styles.tagLabel, active && styles.tagLabelActive]}>{tag.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Review text */}
          <Text style={styles.fieldLabel}>Tell your story</Text>
          <View style={[styles.textArea, focused && styles.textAreaFocused]}>
            <TextInput
              style={styles.textInput}
              placeholder="What made this happy hour special? Share deals, vibes, tips for others…"
              placeholderTextColor={COLORS.faded}
              value={text}
              onChangeText={setText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              multiline
              numberOfLines={5}
              keyboardAppearance="dark"
              textAlignVertical="top"
            />
          </View>
          <Text style={[styles.charCount, text.length > 0 && text.length < 10 && { color: COLORS.status.error }]}>
            {text.length < 10 ? `${10 - text.length} more characters needed` : `${text.length} characters`}
          </Text>

          {submitError ? (
            <Text style={styles.errorText}>{submitError}</Text>
          ) : null}
        </ScrollView>

        {/* Submit CTA */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit || loading) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="star" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Post Review</Text>
              </>
            )}
          </TouchableOpacity>
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

  scrollContent: { padding: SPACING.lg, paddingBottom: 120 },

  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    marginBottom: SPACING.xl,
    minHeight: 72,
  },
  restaurantEmoji: { fontSize: 32 },
  restaurantName: { fontFamily: FONTS.dmMedium, fontSize: 16, color: COLORS.cream, marginBottom: 3 },
  restaurantMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  restaurantNeighborhood: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },

  fieldLabel: {
    fontFamily: FONTS.dmMedium, fontSize: 12,
    color: COLORS.muted, letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING.md, marginTop: SPACING.xs,
  },

  starSection: { alignItems: 'center', marginBottom: SPACING.xl },
  starPickerRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  starBtn: { padding: 4 },
  starLabel: { fontFamily: FONTS.playfair, fontSize: 22, color: COLORS.gold },

  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl },
  tagChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1.5, borderColor: COLORS.border.default,
  },
  tagChipActive: {
    backgroundColor: COLORS.orange, borderColor: COLORS.orange,
    shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  tagLabel: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.muted },
  tagLabelActive: { color: '#fff' },

  textArea: {
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border.default,
    padding: SPACING.md,
    minHeight: 120,
    marginBottom: SPACING.xs,
  },
  textAreaFocused: { borderColor: COLORS.orange, backgroundColor: 'rgba(255,107,26,0.06)' },
  textInput: { fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.cream, lineHeight: 22 },
  charCount: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, textAlign: 'right', marginBottom: SPACING.lg },
  errorText: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.status.error, textAlign: 'center', marginBottom: SPACING.md },

  ctaWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: 'rgba(26,10,0,0.96)',
    borderTopWidth: 1, borderTopColor: COLORS.border.subtle,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.full,
    height: 56,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 8,
  },
  btnDisabled: { opacity: 0.45 },
  submitBtnText: { fontFamily: FONTS.dmMedium, fontSize: 16, color: '#FFFFFF' },

  // Success
  successScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  successRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(232,168,48,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(232,168,48,0.30)',
    marginBottom: SPACING.xl,
  },
  successEmoji: { fontSize: 50 },
  successTitle: { fontFamily: FONTS.playfair, fontSize: 30, color: COLORS.cream, marginBottom: SPACING.sm },
  successSub: { fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  successStars: { flexDirection: 'row', gap: 6, marginBottom: SPACING.md },
  pointsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(232,168,48,0.12)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(232,168,48,0.25)',
    marginBottom: SPACING.xxl,
  },
  pointsBadgeText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.gold },
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
